export type Team = "red" | "blue";
type Phase = "waiting" | "freeze" | "live" | "over";

interface P {
  id: string;
  name: string;
  team: Team;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  alive: boolean;
  kills: number;
  deaths: number;
  god: boolean;
  last: number;
}

interface Ev {
  seq: number;
  t: "shot" | "kill";
  id?: string;
  o?: number[];
  d?: number[];
  killer?: string;
  victim?: string;
  kTeam?: Team;
  vTeam?: Team;
  head?: boolean;
}

interface Room {
  code: string;
  players: Map<string, P>;
  round: {
    num: number;
    phase: Phase;
    endAt: number;
    score: { red: number; blue: number };
    winner: Team | "draw" | null;
    matchWinner: Team | null;
  };
  events: Ev[];
  seq: number;
}

const WIN_SCORE = 5;
const FREEZE_MS = 3000;
const LIVE_MS = 120000;
const OVER_MS = 5000;
const MATCH_OVER_MS = 8000;
const MAX_PLAYERS = 20;

const g = globalThis as unknown as { __rooms?: Map<string, Room> };
const rooms: Map<string, Room> = (g.__rooms ??= new Map());

function num(v: unknown, def = 0): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(-500, Math.min(500, n));
}

function cleanCode(c: unknown): string {
  return String(c ?? "main").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16).toLowerCase() || "main";
}

function getRoom(code: string): Room {
  let r = rooms.get(code);
  if (!r) {
    r = {
      code,
      players: new Map(),
      round: { num: 0, phase: "waiting", endAt: 0, score: { red: 0, blue: 0 }, winner: null, matchWinner: null },
      events: [],
      seq: 0,
    };
    rooms.set(code, r);
  }
  return r;
}

function sweep(now: number) {
  for (const [code, room] of rooms) {
    for (const [id, p] of room.players) {
      if (now - p.last > 6000) room.players.delete(id);
    }
    if (room.players.size === 0) rooms.delete(code);
  }
}

function counts(room: Room) {
  const c = { redTotal: 0, blueTotal: 0, redAlive: 0, blueAlive: 0 };
  for (const p of room.players.values()) {
    if (p.team === "red") {
      c.redTotal++;
      if (p.alive) c.redAlive++;
    } else {
      c.blueTotal++;
      if (p.alive) c.blueAlive++;
    }
  }
  return c;
}

function startRound(room: Room, now: number) {
  room.round.num++;
  room.round.phase = "freeze";
  room.round.endAt = now + FREEZE_MS;
  room.round.winner = null;
  room.round.matchWinner = null;
  for (const p of room.players.values()) {
    p.alive = true;
    p.hp = 100;
  }
}

function tick(room: Room, now: number) {
  const r = room.round;
  const c = counts(room);
  if (c.redTotal === 0 || c.blueTotal === 0) {
    if (r.phase !== "waiting") {
      r.phase = "waiting";
      r.winner = null;
      r.matchWinner = null;
      for (const p of room.players.values()) {
        p.alive = true;
        p.hp = 100;
      }
    }
    return;
  }
  if (r.phase === "waiting") {
    r.score = { red: 0, blue: 0 };
    startRound(room, now);
    return;
  }
  if (r.phase === "freeze" && now >= r.endAt) {
    r.phase = "live";
    r.endAt = now + LIVE_MS;
    return;
  }
  if (r.phase === "live") {
    let winner: Team | "draw" | null = null;
    if (c.redAlive === 0 && c.blueAlive === 0) winner = "draw";
    else if (c.redAlive === 0) winner = "blue";
    else if (c.blueAlive === 0) winner = "red";
    else if (now >= r.endAt) winner = c.redAlive > c.blueAlive ? "red" : c.blueAlive > c.redAlive ? "blue" : "draw";
    if (winner) {
      r.phase = "over";
      r.winner = winner;
      if (winner !== "draw") r.score[winner]++;
      if (r.score.red >= WIN_SCORE) r.matchWinner = "red";
      else if (r.score.blue >= WIN_SCORE) r.matchWinner = "blue";
      r.endAt = now + (r.matchWinner ? MATCH_OVER_MS : OVER_MS);
    }
    return;
  }
  if (r.phase === "over" && now >= r.endAt) {
    if (r.matchWinner) {
      r.score = { red: 0, blue: 0 };
      for (const p of room.players.values()) {
        p.kills = 0;
        p.deaths = 0;
      }
    }
    startRound(room, now);
  }
}

function pushEv(room: Room, ev: Omit<Ev, "seq">) {
  room.seq++;
  room.events.push({ ...ev, seq: room.seq });
  if (room.events.length > 150) room.events.splice(0, room.events.length - 150);
}

function state(room: Room, now: number, lastSeq: number) {
  return {
    now,
    seq: room.seq,
    round: room.round,
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      x: p.x,
      y: p.y,
      z: p.z,
      yaw: p.yaw,
      hp: p.hp,
      alive: p.alive,
      kills: p.kills,
      deaths: p.deaths,
    })),
    events: room.events.filter((e) => e.seq > lastSeq),
  };
}

export function join(codeRaw: unknown, nameRaw: unknown, teamRaw: unknown) {
  const now = Date.now();
  sweep(now);
  const code = cleanCode(codeRaw);
  const room = getRoom(code);
  if (room.players.size >= MAX_PLAYERS) return { error: "Комната заполнена" };
  const c = counts(room);
  let team: Team;
  if (teamRaw === "red" || teamRaw === "blue") team = teamRaw;
  else if (c.redTotal < c.blueTotal) team = "red";
  else if (c.blueTotal < c.redTotal) team = "blue";
  else team = Math.random() < 0.5 ? "red" : "blue";
  const id = Math.random().toString(36).slice(2, 10);
  const name = String(nameRaw ?? "Player").replace(/[<>]/g, "").slice(0, 16) || "Player";
  room.players.set(id, {
    id,
    name,
    team,
    x: 0,
    y: 0,
    z: team === "red" ? 43 : -43,
    yaw: 0,
    hp: 100,
    alive: true,
    kills: 0,
    deaths: 0,
    god: false,
    last: now,
  });
  tick(room, now);
  return { id, team, code, state: state(room, now, room.seq) };
}

interface Hit {
  t?: string;
  d?: number;
  h?: boolean;
}
interface Shot {
  o?: number[];
  d?: number[];
}
interface SyncBody {
  room?: unknown;
  id?: unknown;
  x?: unknown;
  y?: unknown;
  z?: unknown;
  yaw?: unknown;
  god?: unknown;
  hits?: Hit[];
  shots?: Shot[];
  lastSeq?: unknown;
}

export function sync(b: SyncBody) {
  const now = Date.now();
  sweep(now);
  const room = rooms.get(cleanCode(b.room));
  const p = room?.players.get(String(b.id));
  if (!room || !p) return { gone: true };
  p.last = now;
  p.x = num(b.x);
  p.y = num(b.y);
  p.z = num(b.z);
  p.yaw = num(b.yaw);
  p.god = !!b.god;
  if (p.god) p.hp = 100;

  if (Array.isArray(b.shots)) {
    for (const s of b.shots.slice(0, 6)) {
      if (!Array.isArray(s.o) || !Array.isArray(s.d)) continue;
      pushEv(room, { t: "shot", id: p.id, o: s.o.slice(0, 3).map((v) => num(v)), d: s.d.slice(0, 3).map((v) => num(v)) });
    }
  }

  if (room.round.phase === "live" && p.alive && Array.isArray(b.hits)) {
    for (const h of b.hits.slice(0, 30)) {
      const tgt = room.players.get(String(h.t));
      if (!tgt || !tgt.alive || tgt.team === p.team || tgt.god) continue;
      tgt.hp -= Math.max(0, Math.min(1000, num(h.d)));
      if (tgt.hp <= 0) {
        tgt.hp = 0;
        tgt.alive = false;
        tgt.deaths++;
        p.kills++;
        pushEv(room, { t: "kill", killer: p.name, victim: tgt.name, kTeam: p.team, vTeam: tgt.team, head: !!h.h });
      }
    }
  }

  tick(room, now);
  return state(room, now, Number(b.lastSeq) || 0);
}

export function leave(codeRaw: unknown, id: unknown) {
  const room = rooms.get(cleanCode(codeRaw));
  if (!room) return;
  room.players.delete(String(id));
  tick(room, Date.now());
  if (room.players.size === 0) rooms.delete(room.code);
}

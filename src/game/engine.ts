import * as THREE from "three";
import { ARENA, BOXES, spawnPoint, type Team } from "./map";

export type Mode = "solo" | "mp";
export interface StartOpts {
  mode: Mode;
  name: string;
  team: Team | "auto";
  bots: number;
  difficulty: 0 | 1 | 2;
  room: string;
}

export interface Cheats {
  aimbot: boolean;
  aimHead: boolean;
  aimVis: boolean;
  aimFov: number;
  aimSmooth: number;
  autoShoot: boolean;
  wallhack: boolean;
  esp: boolean;
  radar: boolean;
  god: boolean;
  infAmmo: boolean;
  noRecoil: boolean;
  noSpread: boolean;
  rapid: boolean;
  oneShot: boolean;
  speed: boolean;
  superJump: boolean;
  fly: boolean;
}

export const DEFAULT_CHEATS: Cheats = {
  aimbot: false,
  aimHead: true,
  aimVis: true,
  aimFov: 60,
  aimSmooth: 0.3,
  autoShoot: false,
  wallhack: false,
  esp: false,
  radar: false,
  god: false,
  infAmmo: false,
  noRecoil: false,
  noSpread: false,
  rapid: false,
  oneShot: false,
  speed: false,
  superJump: false,
  fly: false,
};

export interface BoardRow {
  id: string;
  name: string;
  team: Team;
  kills: number;
  deaths: number;
  alive: boolean;
  me: boolean;
}

export interface Hud {
  mode: Mode;
  team: Team;
  hp: number;
  alive: boolean;
  weaponIdx: number;
  weapons: string[];
  mag: number;
  reserve: number;
  reloading: boolean;
  scoped: boolean;
  phase: string;
  roundNum: number;
  timeLeft: number;
  score: { red: number; blue: number };
  winner: string | null;
  matchWinner: Team | null;
  feed: { text: string; color: string }[];
  board: BoardRow[];
  showBoard: boolean;
  cheats: Cheats;
  aliveRed: number;
  aliveBlue: number;
  ping: number;
  players: number;
  hit: number;
  headHit: boolean;
  dmg: number;
  notice: string;
  error: string;
  connected: boolean;
}

export interface Callbacks {
  onHud: (h: Hud) => void;
  onLock: (locked: boolean) => void;
  onCheatKey: () => void;
}

interface Weapon {
  name: string;
  dmg: number;
  delay: number;
  auto: boolean;
  mag: number;
  reserve: number;
  spread: number;
  pellets: number;
  recoil: number;
  reload: number;
  zoom: number;
  color: number;
  len: number;
}

const WEAPONS: Weapon[] = [
  { name: "Автомат", dmg: 22, delay: 0.1, auto: true, mag: 30, reserve: 120, spread: 0.012, pellets: 1, recoil: 0.012, reload: 1.8, zoom: 1.4, color: 0x2d3340, len: 1 },
  { name: "Пистолет", dmg: 34, delay: 0.2, auto: false, mag: 12, reserve: 72, spread: 0.006, pellets: 1, recoil: 0.02, reload: 1.2, zoom: 1.3, color: 0x555b66, len: 0.55 },
  { name: "Дробовик", dmg: 13, delay: 0.85, auto: false, mag: 6, reserve: 36, spread: 0.055, pellets: 8, recoil: 0.06, reload: 2.4, zoom: 1.2, color: 0x6b4a2b, len: 1.15 },
  { name: "Снайперка", dmg: 95, delay: 1.3, auto: false, mag: 5, reserve: 25, spread: 0.0012, pellets: 1, recoil: 0.08, reload: 2.6, zoom: 4, color: 0x1f3b2d, len: 1.5 },
];

interface BotAI {
  wp: THREE.Vector3;
  retarget: number;
  tgt: Ent | null;
  reactT: number;
  fireT: number;
  strafe: number;
  strafeT: number;
  stuckT: number;
  stuckCheck: number;
  lastPos: THREE.Vector3;
  lastKnown: THREE.Vector3 | null;
}

interface Ent {
  id: string;
  name: string;
  team: Team;
  bot: boolean;
  hp: number;
  alive: boolean;
  kills: number;
  deaths: number;
  pos: THREE.Vector3;
  target: THREE.Vector3;
  yaw: number;
  mesh: THREE.Group | null;
  legs: THREE.Mesh[];
  moving: number;
  fall: number;
  ai?: BotAI;
}

interface Round {
  num: number;
  phase: "waiting" | "freeze" | "live" | "over";
  endAt: number;
  score: { red: number; blue: number };
  winner: string | null;
  matchWinner: Team | null;
}

const TEAM_COLOR: Record<Team, number> = { red: 0xe5393b, blue: 0x2f7fe6 };
const TEAM_CSS: Record<Team, string> = { red: "#ff6b6d", blue: "#6aaaff" };
const WIN_SCORE = 5;
const BOT_NAMES = [
  "Viper", "Ghost", "Raven", "Blaze", "Shadow", "Hunter", "Wolf", "Cobra", "Titan", "Nova",
  "Rogue", "Falcon", "Storm", "Reaper", "Spike", "Echo", "Drift", "Fox", "Jaguar", "Onyx",
  "Pixel", "Bolt", "Havoc", "Zero", "Rex", "Mirage", "Sniper", "Apex", "Omen", "Frost",
];

/* ---------- geometry helpers ---------- */

function rayBox(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  minx: number, miny: number, minz: number,
  maxx: number, maxy: number, maxz: number
): number {
  if (Math.abs(dx) < 1e-9) dx = 1e-9;
  if (Math.abs(dy) < 1e-9) dy = 1e-9;
  if (Math.abs(dz) < 1e-9) dz = 1e-9;
  const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz;
  let t1 = (minx - ox) * ix, t2 = (maxx - ox) * ix;
  let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2);
  t1 = (miny - oy) * iy; t2 = (maxy - oy) * iy;
  tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
  t1 = (minz - oz) * iz; t2 = (maxz - oz) * iz;
  tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
  if (tmax < 0 || tmin > tmax) return Infinity;
  return tmin >= 0 ? tmin : tmax >= 0 ? 0 : Infinity;
}

function wallDist(o: THREE.Vector3, d: THREE.Vector3, max: number): number {
  let best = max;
  for (const b of BOXES) {
    const t = rayBox(o.x, o.y, o.z, d.x, d.y, d.z, b.minx, 0, b.minz, b.maxx, b.h, b.maxz);
    if (t < best) best = t;
  }
  return best;
}

function groundAt(x: number, z: number, y: number): number {
  let g = 0;
  for (const b of BOXES) {
    if (x > b.minx - 0.3 && x < b.maxx + 0.3 && z > b.minz - 0.3 && z < b.maxz + 0.3 && b.h <= y + 0.6) {
      if (b.h > g) g = b.h;
    }
  }
  return g;
}

function resolve(pos: THREE.Vector3, r: number) {
  for (let it = 0; it < 2; it++) {
    for (const b of BOXES) {
      if (pos.y >= b.h - 0.55) continue;
      const cx = Math.max(b.minx, Math.min(pos.x, b.maxx));
      const cz = Math.max(b.minz, Math.min(pos.z, b.maxz));
      const dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          pos.x += (dx / d) * (r - d);
          pos.z += (dz / d) * (r - d);
        } else {
          const l = pos.x - b.minx, rr = b.maxx - pos.x, t = pos.z - b.minz, bt = b.maxz - pos.z;
          const m = Math.min(l, rr, t, bt);
          if (m === l) pos.x = b.minx - r;
          else if (m === rr) pos.x = b.maxx + r;
          else if (m === t) pos.z = b.minz - r;
          else pos.z = b.maxz + r;
        }
      }
    }
  }
  const lim = ARENA - 0.6;
  pos.x = Math.max(-lim, Math.min(lim, pos.x));
  pos.z = Math.max(-lim, Math.min(lim, pos.z));
}

function traceEnt(e: Ent, o: THREE.Vector3, d: THREE.Vector3): { t: number; head: boolean } {
  const p = e.pos;
  const ht = rayBox(o.x, o.y, o.z, d.x, d.y, d.z, p.x - 0.22, p.y + 1.45, p.z - 0.22, p.x + 0.22, p.y + 1.85, p.z + 0.22);
  const bt = rayBox(o.x, o.y, o.z, d.x, d.y, d.z, p.x - 0.38, p.y, p.z - 0.38, p.x + 0.38, p.y + 1.45, p.z + 0.38);
  return { t: Math.min(ht, bt), head: ht <= bt && ht < Infinity };
}

function normAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);

/* ---------- engine ---------- */

export class Engine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(80, 1, 0.05, 220);
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private disposed = false;
  private clock = 0;
  private last = 0;

  private gun = new THREE.Group();
  private gunBody: THREE.Mesh;
  private gunTip = new THREE.Object3D();
  private flash: THREE.Mesh;
  private flashT = 0;
  private kick = 0;

  private me: Ent;
  private ents = new Map<string, Ent>();
  private round: Round = { num: 0, phase: "waiting", endAt: 0, score: { red: 0, blue: 0 }, winner: null, matchWinner: null };

  private yaw = 0;
  private pitch = 0;
  private vy = 0;
  private onGround = true;
  private sens = 0.0022;
  private keys: Record<string, boolean> = {};
  private firing = false;
  private fireClick = false;
  private ads = false;
  private fov = 80;

  private wi = 0;
  private mags = WEAPONS.map((w) => w.mag);
  private reserves = WEAPONS.map((w) => w.reserve);
  private reloading = false;
  private reloadEnd = 0;
  private nextFire = 0;

  cheats: Cheats = { ...DEFAULT_CHEATS };
  private showBoard = false;
  private feed: { text: string; color: string; t: number }[] = [];
  private hitT = 0;
  private headHit = false;
  private dmgT = 0;
  private notice = "";
  private noticeT = 0;
  private error = "";
  private hudT = 0;

  private tracers: { line: THREE.Line; life: number }[] = [];
  private tracerMat = new THREE.LineBasicMaterial({ color: 0xffe08a });
  private botTracerMat: Record<Team, THREE.LineBasicMaterial> = {
    red: new THREE.LineBasicMaterial({ color: 0xff8a8a }),
    blue: new THREE.LineBasicMaterial({ color: 0x8abaff }),
  };

  private mats: Record<Team, { body: THREE.MeshLambertMaterial; head: THREE.MeshLambertMaterial; dark: THREE.MeshLambertMaterial }>;
  private geo = {
    torso: new THREE.BoxGeometry(0.6, 0.7, 0.35),
    head: new THREE.BoxGeometry(0.32, 0.32, 0.32),
    leg: new THREE.BoxGeometry(0.22, 0.75, 0.25),
    arm: new THREE.BoxGeometry(0.16, 0.55, 0.16),
    gun: new THREE.BoxGeometry(0.1, 0.12, 0.55),
  };

  private ac?: AudioContext;
  private noiseBuf?: AudioBuffer;

  // multiplayer
  private myId = "";
  private netTimer = 0;
  private inflight = false;
  private pendingHits: { t: string; d: number; h: boolean }[] = [];
  private pendingShots: { o: number[]; d: number[] }[] = [];
  private lastSeq = 0;
  private ping = 0;
  private connected = false;
  private joining = false;
  private mpPlayers = 1;

  private handlers: [EventTarget, string, EventListener][] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private overlay: HTMLCanvasElement,
    private opts: StartOpts,
    private cb: Callbacks
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.ctx = overlay.getContext("2d")!;

    const team: Team = opts.team === "auto" ? (Math.random() < 0.5 ? "red" : "blue") : opts.team;
    this.me = this.makeEnt("me", opts.name || "Player", team, false);
    this.me.mesh = null;

    this.mats = {
      red: this.makeMats(TEAM_COLOR.red),
      blue: this.makeMats(TEAM_COLOR.blue),
    };

    this.buildWorld();
    this.gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.45), new THREE.MeshLambertMaterial({ color: 0x2d3340 }));
    this.flash = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd060 }));
    this.buildGun();
    this.scene.add(this.camera);

    this.resize();
    this.bind();
    this.setupMode();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ---------- setup ---------- */

  private makeMats(color: number) {
    return {
      body: new THREE.MeshLambertMaterial({ color }),
      head: new THREE.MeshLambertMaterial({ color: 0xe0b890 }),
      dark: new THREE.MeshLambertMaterial({ color: 0x20242c }),
    };
  }

  private makeEnt(id: string, name: string, team: Team, bot: boolean): Ent {
    return {
      id, name, team, bot, hp: 100, alive: true, kills: 0, deaths: 0,
      pos: new THREE.Vector3(), target: new THREE.Vector3(), yaw: 0,
      mesh: null, legs: [], moving: 0, fall: 0,
    };
  }

  private buildWorld() {
    const s = this.scene;
    s.background = new THREE.Color(0x8fb8e8);
    s.fog = new THREE.Fog(0x8fb8e8, 40, 140);
    s.add(new THREE.HemisphereLight(0xdfeaff, 0x56606a, 1.0));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(30, 60, 20);
    s.add(sun);

    // floor
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d")!;
    x.fillStyle = "#5b6470";
    x.fillRect(0, 0, 128, 128);
    x.strokeStyle = "#4b535e";
    x.lineWidth = 3;
    x.strokeRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(ARENA / 2.5, ARENA / 2.5);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA * 2, ARENA * 2), new THREE.MeshLambertMaterial({ map: tex }));
    floor.rotation.x = -Math.PI / 2;
    s.add(floor);

    // spawn pads
    for (const t of ["red", "blue"] as Team[]) {
      const pad = new THREE.Mesh(
        new THREE.PlaneGeometry(ARENA * 2, 14),
        new THREE.MeshBasicMaterial({ color: TEAM_COLOR[t], transparent: true, opacity: 0.28 })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(0, 0.02, t === "red" ? 43 : -43);
      s.add(pad);
    }

    const edgeMat = new THREE.LineBasicMaterial({ color: 0x1a1d24 });
    for (const b of BOXES) {
      const g = new THREE.BoxGeometry(b.w, b.h, b.d);
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: b.color }));
      m.position.set(b.x, b.h / 2, b.z);
      s.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat);
      e.position.copy(m.position);
      s.add(e);
    }
  }

  private buildGun() {
    this.gun.add(this.gunBody);
    this.gunTip.position.set(0, 0.02, -0.3);
    this.gun.add(this.gunTip);
    this.flash.position.set(0, 0.02, -0.35);
    this.flash.visible = false;
    this.gun.add(this.flash);
    this.gun.position.set(0.22, -0.2, -0.45);
    this.camera.add(this.gun);
    this.applyWeaponLook();
  }

  private applyWeaponLook() {
    const w = WEAPONS[this.wi];
    (this.gunBody.material as THREE.MeshLambertMaterial).color.setHex(w.color);
    this.gunBody.scale.set(1, 1, w.len);
    this.gunTip.position.z = -0.225 * w.len - 0.05;
    this.flash.position.z = this.gunTip.position.z - 0.05;
  }

  private makeMesh(team: Team): { g: THREE.Group; legs: THREE.Mesh[] } {
    const m = this.mats[team];
    const g = new THREE.Group();
    const legs: THREE.Mesh[] = [];
    for (const sx of [-0.14, 0.14]) {
      const pivot = new THREE.Mesh(this.geo.leg, m.dark);
      pivot.geometry = this.geo.leg;
      pivot.position.set(sx, 0.375, 0);
      g.add(pivot);
      legs.push(pivot);
    }
    const torso = new THREE.Mesh(this.geo.torso, m.body);
    torso.position.y = 1.1;
    g.add(torso);
    const head = new THREE.Mesh(this.geo.head, m.head);
    head.position.y = 1.62;
    g.add(head);
    for (const sx of [-0.38, 0.38]) {
      const arm = new THREE.Mesh(this.geo.arm, m.body);
      arm.position.set(sx, 1.15, sx > 0 ? -0.12 : -0.05);
      arm.rotation.x = -0.9;
      g.add(arm);
    }
    const gun = new THREE.Mesh(this.geo.gun, m.dark);
    gun.position.set(0.3, 1.15, -0.4);
    g.add(gun);
    return { g, legs };
  }

  private attachMesh(e: Ent) {
    const { g, legs } = this.makeMesh(e.team);
    e.mesh = g;
    e.legs = legs;
    this.scene.add(g);
    this.updateWallhack();
  }

  private removeEnt(e: Ent) {
    if (e.mesh) this.scene.remove(e.mesh);
    this.ents.delete(e.id);
  }

  private setupMode() {
    if (this.opts.mode === "solo") {
      const n = Math.max(1, Math.min(15, this.opts.bots));
      const myTeam = this.me.team;
      const other: Team = myTeam === "red" ? "blue" : "red";
      const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
      let ni = 0;
      const add = (team: Team, count: number) => {
        for (let i = 0; i < count; i++) {
          const b = this.makeEnt("bot" + this.ents.size, names[ni++ % names.length], team, true);
          b.ai = {
            wp: new THREE.Vector3(), retarget: rnd(0, 0.3), tgt: null, reactT: 0, fireT: rnd(0.3, 1),
            strafe: 0, strafeT: 0, stuckT: 0, stuckCheck: 0.5, lastPos: new THREE.Vector3(), lastKnown: null,
          };
          this.attachMesh(b);
          this.ents.set(b.id, b);
        }
      };
      add(myTeam, n - 1);
      add(other, n);
      this.startRoundSolo();
    } else {
      this.respawnMe(0);
      this.joinServer();
    }
  }

  /* ---------- input ---------- */

  private on(t: EventTarget, ev: string, fn: (e: never) => void) {
    t.addEventListener(ev, fn as EventListener);
    this.handlers.push([t, ev, fn as EventListener]);
  }

  private bind() {
    this.on(window, "resize", () => this.resize());
    this.on(document, "pointerlockchange", () => {
      const l = document.pointerLockElement === this.canvas;
      if (!l) {
        this.firing = false;
        this.ads = false;
        this.keys = {};
        this.showBoard = false;
      }
      this.cb.onLock(l);
    });
    this.on(document, "mousemove", (e: MouseEvent) => {
      if (document.pointerLockElement !== this.canvas) return;
      const k = this.sens * (this.camera.fov / 80);
      this.yaw -= e.movementX * k;
      this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch - e.movementY * k));
    });
    this.on(document, "mousedown", (e: MouseEvent) => {
      if (document.pointerLockElement !== this.canvas) return;
      if (e.button === 0) {
        this.firing = true;
        this.fireClick = true;
      }
      if (e.button === 2) this.ads = true;
    });
    this.on(document, "mouseup", (e: MouseEvent) => {
      if (e.button === 0) this.firing = false;
      if (e.button === 2) this.ads = false;
    });
    this.on(document, "contextmenu", (e: Event) => e.preventDefault());
    this.on(window, "blur", () => {
      this.keys = {};
      this.firing = false;
    });
    this.on(document, "keydown", (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "KeyC") {
        this.cb.onCheatKey();
        return;
      }
      if (document.pointerLockElement !== this.canvas) return;
      this.keys[e.code] = true;
      if (e.code === "Tab") {
        e.preventDefault();
        this.showBoard = true;
      }
      if (e.code === "KeyR") this.startReload();
      if (e.code.startsWith("Digit")) {
        const n = Number(e.code.slice(5)) - 1;
        if (n >= 0 && n < WEAPONS.length) this.switchWeapon(n);
      }
      const hot: Record<string, keyof Cheats> = {
        KeyT: "aimbot", KeyG: "wallhack", KeyB: "autoShoot", KeyH: "god", KeyN: "fly", KeyJ: "speed",
      };
      const h = hot[e.code];
      if (h) {
        this.setCheat(h, !this.cheats[h] as never);
      }
    });
    this.on(document, "keyup", (e: KeyboardEvent) => {
      this.keys[e.code] = false;
      if (e.code === "Tab") this.showBoard = false;
    });
  }

  private resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.overlay.width = w;
    this.overlay.height = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  lock() {
    this.ensureAudio();
    try {
      const p = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      p?.catch?.(() => {});
    } catch {
      /* ignore */
    }
  }

  setSens(v: number) {
    this.sens = v;
  }

  setCheat<K extends keyof Cheats>(k: K, v: Cheats[K]) {
    this.cheats[k] = v;
    if (k === "wallhack") this.updateWallhack();
    if (typeof v === "boolean") {
      const names: Record<string, string> = {
        aimbot: "Аимбот", wallhack: "Валлхак", autoShoot: "Триггербот", god: "Бессмертие", fly: "Полёт", speed: "Спидхак",
      };
      if (names[k as string]) this.say(`${names[k as string]}: ${v ? "ВКЛ" : "ВЫКЛ"}`);
    }
  }

  private say(t: string) {
    this.notice = t;
    this.noticeT = 2;
  }

  private updateWallhack() {
    const wh = this.cheats.wallhack;
    for (const t of ["red", "blue"] as Team[]) {
      const on = wh && t !== this.me.team;
      for (const m of Object.values(this.mats[t])) {
        m.depthTest = !on;
        m.depthWrite = !on;
      }
    }
    for (const e of this.ents.values()) {
      if (!e.mesh) continue;
      const on = wh && e.team !== this.me.team;
      e.mesh.traverse((o) => {
        o.renderOrder = on ? 20 : 0;
      });
    }
  }

  /* ---------- audio ---------- */

  private ensureAudio() {
    if (this.ac) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ac = new AC();
      const len = this.ac.sampleRate * 0.3;
      this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      /* no audio */
    }
  }

  private sfx(kind: "shot" | "far" | "hit" | "head" | "kill" | "hurt" | "reload", vol = 1) {
    const ac = this.ac;
    if (!ac || !this.noiseBuf || vol <= 0.01) return;
    const t = ac.currentTime;
    const g = ac.createGain();
    g.connect(ac.destination);
    if (kind === "shot" || kind === "far") {
      const src = ac.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ac.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = kind === "shot" ? 2200 : 900;
      src.connect(f);
      f.connect(g);
      g.gain.setValueAtTime(0.5 * vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      src.start(t);
      src.stop(t + 0.2);
    } else {
      const o = ac.createOscillator();
      o.connect(g);
      const cfg = {
        hit: [900, 0.06, "square"], head: [1500, 0.09, "square"], kill: [600, 0.18, "triangle"],
        hurt: [140, 0.15, "sawtooth"], reload: [300, 0.05, "square"],
      }[kind] as [number, number, OscillatorType];
      o.frequency.value = cfg[0];
      o.type = cfg[2];
      g.gain.setValueAtTime(0.15 * vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + cfg[1]);
      o.start(t);
      o.stop(t + cfg[1] + 0.02);
    }
  }

  /* ---------- rounds (solo) ---------- */

  private allEnts(): Ent[] {
    return [this.me, ...this.ents.values()];
  }

  private respawnMe(idx: number) {
    const sp = spawnPoint(this.me.team, idx);
    this.me.pos.set(sp.x, 0, sp.z);
    this.yaw = sp.yaw;
    this.pitch = 0;
    this.vy = 0;
    this.me.hp = 100;
    this.me.alive = true;
    this.mags = WEAPONS.map((w) => w.mag);
    this.reserves = WEAPONS.map((w) => w.reserve);
    this.reloading = false;
    this.wi = 0;
    this.applyWeaponLook();
  }

  private startRoundSolo() {
    const r = this.round;
    r.num++;
    r.phase = "freeze";
    r.endAt = this.clock + 3;
    r.winner = null;
    r.matchWinner = null;
    const idx: Record<Team, number> = { red: 0, blue: 0 };
    this.respawnMe(idx[this.me.team]++);
    for (const e of this.ents.values()) {
      const sp = spawnPoint(e.team, idx[e.team]++);
      e.pos.set(sp.x, 0, sp.z);
      e.yaw = sp.yaw;
      e.hp = 100;
      e.alive = true;
      e.fall = 0;
      if (e.ai) {
        e.ai.tgt = null;
        e.ai.lastKnown = null;
        this.newWaypoint(e);
      }
    }
  }

  private tickRoundSolo() {
    const r = this.round;
    if (r.phase === "freeze" && this.clock >= r.endAt) {
      r.phase = "live";
      r.endAt = this.clock + 120;
      this.say("Раунд начался!");
    } else if (r.phase === "live") {
      const c = this.counts();
      let w: string | null = null;
      if (c.red === 0 && c.blue === 0) w = "draw";
      else if (c.red === 0) w = "blue";
      else if (c.blue === 0) w = "red";
      else if (this.clock >= r.endAt) w = c.red > c.blue ? "red" : c.blue > c.red ? "blue" : "draw";
      if (w) {
        r.phase = "over";
        r.winner = w;
        if (w === "red" || w === "blue") r.score[w]++;
        if (r.score.red >= WIN_SCORE) r.matchWinner = "red";
        else if (r.score.blue >= WIN_SCORE) r.matchWinner = "blue";
        r.endAt = this.clock + (r.matchWinner ? 8 : 5);
      }
    } else if (r.phase === "over" && this.clock >= r.endAt) {
      if (r.matchWinner) {
        r.score = { red: 0, blue: 0 };
        for (const e of this.allEnts()) {
          e.kills = 0;
          e.deaths = 0;
        }
      }
      this.startRoundSolo();
    }
  }

  private counts() {
    const c = { red: 0, blue: 0 };
    for (const e of this.allEnts()) if (e.alive) c[e.team]++;
    return c;
  }

  /* ---------- combat ---------- */

  private canShoot() {
    return this.me.alive && (this.round.phase === "live" || this.round.phase === "waiting");
  }
  private canMove() {
    return this.me.alive && this.round.phase !== "freeze";
  }

  private addFeed(text: string, color: string) {
    this.feed.push({ text, color, t: this.clock });
    if (this.feed.length > 6) this.feed.shift();
  }

  private hurt(victim: Ent, dmg: number, head: boolean, attacker: Ent) {
    if (!victim.alive) return;
    if (victim === this.me) {
      if (this.cheats.god) return;
      this.dmgT = 1;
      this.sfx("hurt");
    }
    victim.hp -= dmg;
    if (victim.hp <= 0) {
      victim.hp = 0;
      victim.alive = false;
      victim.deaths++;
      attacker.kills++;
      this.addFeed(`${attacker.name}  ➜  ${victim.name}${head ? "  ☠" : ""}`, TEAM_CSS[attacker.team]);
      if (attacker === this.me) this.sfx("kill");
    }
  }

  private startReload() {
    const w = WEAPONS[this.wi];
    if (this.reloading || this.mags[this.wi] >= w.mag) return;
    if (this.reserves[this.wi] <= 0 && !this.cheats.infAmmo) return;
    this.reloading = true;
    this.reloadEnd = this.clock + w.reload;
    this.sfx("reload");
  }

  private switchWeapon(n: number) {
    if (n === this.wi) return;
    this.wi = n;
    this.reloading = false;
    this.nextFire = this.clock + 0.25;
    this.applyWeaponLook();
  }

  private eye(): THREE.Vector3 {
    return new THREE.Vector3(this.me.pos.x, this.me.pos.y + 1.7, this.me.pos.z);
  }

  private fireWeapon() {
    const w = WEAPONS[this.wi];
    const c = this.cheats;
    if (this.reloading || this.clock < this.nextFire) return;
    if (this.mags[this.wi] <= 0) {
      this.startReload();
      return;
    }
    this.nextFire = this.clock + w.delay * (c.rapid ? 0.2 : 1);
    if (!c.infAmmo) this.mags[this.wi]--;

    const eye = this.eye();
    const base = new THREE.Vector3();
    this.camera.getWorldDirection(base);
    const right = new THREE.Vector3().crossVectors(base, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, base).normalize();
    const moving = this.me.moving > 0.5;
    const spread = c.noSpread ? 0 : w.spread * (this.ads ? 0.35 : 1) * (moving ? 1.8 : 1) * (this.onGround ? 1 : 2.5);
    const tip = new THREE.Vector3();
    this.gunTip.getWorldPosition(tip);

    for (let i = 0; i < w.pellets; i++) {
      const d = base.clone()
        .addScaledVector(right, (Math.random() - 0.5) * 2 * spread)
        .addScaledVector(up, (Math.random() - 0.5) * 2 * spread)
        .normalize();
      this.shootRay(eye, d, tip, w.dmg, i === 0);
    }
    if (!c.noRecoil) {
      this.pitch += w.recoil * (0.8 + Math.random() * 0.4);
      this.yaw += (Math.random() - 0.5) * w.recoil * 0.6;
    }
    this.kick = Math.min(0.12, this.kick + 0.05 + w.recoil);
    this.flashT = 0.04;
    this.sfx("shot");
    if (w.zoom >= 4) this.nextFire = Math.max(this.nextFire, this.clock + 0.3);
  }

  private shootRay(o: THREE.Vector3, d: THREE.Vector3, tip: THREE.Vector3, dmg: number, report: boolean) {
    const wt = wallDist(o, d, 150);
    let best: { e: Ent; t: number; head: boolean } | null = null;
    for (const e of this.allEnts()) {
      if (e === this.me || !e.alive || e.team === this.me.team) continue;
      const r = traceEnt(e, o, d);
      if (r.t < wt && (!best || r.t < best.t)) best = { e, t: r.t, head: r.head };
    }
    const end = o.clone().addScaledVector(d, best ? best.t : wt);
    this.tracer(tip, end, this.tracerMat);
    if (report && this.opts.mode === "mp") {
      this.pendingShots.push({ o: [tip.x, tip.y, tip.z], d: [end.x - tip.x, end.y - tip.y, end.z - tip.z] });
    }
    if (best) {
      let dealt = dmg * (best.head ? 2 : 1);
      if (this.cheats.oneShot) dealt = 1000;
      this.hitT = 1;
      this.headHit = best.head;
      this.sfx(best.head ? "head" : "hit");
      if (this.opts.mode === "solo") {
        this.hurt(best.e, dealt, best.head, this.me);
      } else {
        this.pendingHits.push({ t: best.e.id, d: dealt, h: best.head });
        best.e.hp = Math.max(1, best.e.hp - dealt);
      }
    }
  }

  private tracer(a: THREE.Vector3, b: THREE.Vector3, mat: THREE.LineBasicMaterial) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), mat);
    line.frustumCulled = false;
    this.scene.add(line);
    this.tracers.push({ line, life: 0.07 });
  }

  /* ---------- aimbot ---------- */

  private aimTarget: Ent | null = null;

  private aimbotStep(dt: number) {
    this.aimTarget = null;
    const c = this.cheats;
    if (!c.aimbot || !this.me.alive || !this.canShoot()) return;
    const eye = this.eye();
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    let best: Ent | null = null;
    let bestAng = (c.aimFov * Math.PI) / 360;
    let bestVec = new THREE.Vector3();
    for (const e of this.allEnts()) {
      if (e === this.me || !e.alive || e.team === this.me.team) continue;
      const tp = new THREE.Vector3(e.pos.x, e.pos.y + (c.aimHead ? 1.65 : 1.15), e.pos.z);
      const v = tp.clone().sub(eye);
      const dist = v.length();
      v.divideScalar(dist);
      const ang = Math.acos(Math.max(-1, Math.min(1, v.dot(fwd))));
      if (ang > bestAng) continue;
      if (c.aimVis && wallDist(eye, v, dist) < dist - 0.3) continue;
      best = e;
      bestAng = ang;
      bestVec = v;
    }
    if (!best) return;
    this.aimTarget = best;
    const ty = Math.atan2(-bestVec.x, -bestVec.z);
    const tp = Math.asin(bestVec.y);
    const k = c.aimSmooth <= 0.01 ? 1 : 1 - Math.pow(c.aimSmooth, dt * 60);
    this.yaw += normAngle(ty - this.yaw) * k;
    this.pitch += (tp - this.pitch) * k;
  }

  private crosshairOnEnemy(): boolean {
    const eye = this.eye();
    const d = new THREE.Vector3();
    this.camera.getWorldDirection(d);
    const wt = wallDist(eye, d, 150);
    for (const e of this.allEnts()) {
      if (e === this.me || !e.alive || e.team === this.me.team) continue;
      if (traceEnt(e, eye, d).t < wt) return true;
    }
    return false;
  }

  /* ---------- bots ---------- */

  private newWaypoint(b: Ent) {
    const ai = b.ai!;
    for (let i = 0; i < 12; i++) {
      let x = rnd(-ARENA + 4, ARENA - 4), z = rnd(-ARENA + 4, ARENA - 4);
      if (Math.random() < 0.5) {
        x = rnd(-35, 35);
        z = (b.team === "red" ? -1 : 1) * rnd(10, 40);
      }
      if (!BOXES.some((o) => x > o.minx - 1 && x < o.maxx + 1 && z > o.minz - 1 && z < o.maxz + 1)) {
        ai.wp.set(x, 0, z);
        return;
      }
    }
    ai.wp.set(0, 0, 0);
  }

  private hasLos(a: THREE.Vector3, b: THREE.Vector3): boolean {
    const d = b.clone().sub(a);
    const dist = d.length();
    d.divideScalar(dist);
    return wallDist(a, d, dist) >= dist - 0.2;
  }

  private updateBot(b: Ent, dt: number) {
    const ai = b.ai!;
    if (!b.alive || this.round.phase !== "live") {
      b.moving = 0;
      return;
    }
    const diff = this.opts.difficulty;
    const eye = new THREE.Vector3(b.pos.x, 1.6, b.pos.z);

    ai.retarget -= dt;
    if (ai.retarget <= 0) {
      ai.retarget = rnd(0.25, 0.5);
      let best: Ent | null = null;
      let bd = 70;
      for (const e of this.allEnts()) {
        if (e === b || !e.alive || e.team === b.team) continue;
        const d = e.pos.distanceTo(b.pos);
        if (d < bd && this.hasLos(eye, new THREE.Vector3(e.pos.x, e.pos.y + 1.2, e.pos.z))) {
          bd = d;
          best = e;
        }
      }
      if (best !== ai.tgt) {
        ai.reactT = Math.max(0.15, 0.7 - diff * 0.2 + rnd(0, 0.3));
      }
      ai.tgt = best;
      if (best) ai.lastKnown = best.pos.clone();
    }

    const speed = 3.6 + diff * 0.7;
    let mx = 0, mz = 0;
    let faceYaw = b.yaw;
    const tgt = ai.tgt && ai.tgt.alive ? ai.tgt : null;

    if (tgt) {
      const to = tgt.pos.clone().sub(b.pos);
      to.y = 0;
      const dist = to.length();
      to.divideScalar(Math.max(dist, 0.001));
      faceYaw = Math.atan2(-to.x, -to.z);
      const fwd = dist > 20 ? 1 : dist < 9 ? -0.8 : 0;
      ai.strafeT -= dt;
      if (ai.strafeT <= 0) {
        ai.strafe = [-1, 0, 1][Math.floor(Math.random() * 3)];
        ai.strafeT = rnd(0.6, 1.6);
      }
      mx = to.x * fwd + -to.z * ai.strafe * 0.8;
      mz = to.z * fwd + to.x * ai.strafe * 0.8;

      ai.reactT -= dt;
      ai.fireT -= dt;
      const aimErr = Math.abs(normAngle(faceYaw - b.yaw));
      if (ai.reactT <= 0 && ai.fireT <= 0 && aimErr < 0.3) {
        ai.fireT = rnd(0.25, 0.55) - diff * 0.06;
        const chance = Math.max(0.1, Math.min(0.8, 0.6 - dist * 0.011 + diff * 0.1));
        const from = new THREE.Vector3(b.pos.x, 1.3, b.pos.z);
        const hit = Math.random() < chance;
        const head = hit && Math.random() < 0.08 + diff * 0.04;
        const aim = new THREE.Vector3(tgt.pos.x, tgt.pos.y + (head ? 1.65 : 1.1), tgt.pos.z);
        if (!hit) aim.add(new THREE.Vector3(rnd(-1.2, 1.2), rnd(-0.6, 0.8), rnd(-1.2, 1.2)));
        this.tracer(from, aim, this.botTracerMat[b.team]);
        const vol = Math.max(0, 1 - this.me.pos.distanceTo(b.pos) / 60) * 0.7;
        this.sfx("far", vol);
        if (hit) this.hurt(tgt, (7 + rnd(0, 5) + diff * 2) * (head ? 2 : 1), head, b);
      }
    } else {
      const to = ai.wp.clone().sub(b.pos);
      to.y = 0;
      const dist = to.length();
      if (dist < 2) {
        if (ai.lastKnown && Math.random() < 0.4) {
          ai.wp.copy(ai.lastKnown);
          ai.lastKnown = null;
        } else this.newWaypoint(b);
      } else {
        to.divideScalar(dist);
        mx = to.x;
        mz = to.z;
        faceYaw = Math.atan2(-to.x, -to.z);
      }
    }

    // stuck detection
    ai.stuckCheck -= dt;
    if (ai.stuckCheck <= 0) {
      ai.stuckCheck = 0.5;
      if (b.pos.distanceTo(ai.lastPos) < 0.35 && (mx !== 0 || mz !== 0)) {
        ai.stuckT = 1;
        if (!tgt) this.newWaypoint(b);
        ai.strafe = Math.random() < 0.5 ? -1 : 1;
      } else ai.stuckT = 0;
      ai.lastPos.copy(b.pos);
    }
    if (ai.stuckT > 0) {
      const rx = -mz, rz = mx;
      mx += rx * ai.strafe * 1.2;
      mz += rz * ai.strafe * 1.2;
    }

    const turn = (6 + diff * 3) * dt;
    b.yaw += Math.max(-turn, Math.min(turn, normAngle(faceYaw - b.yaw)));
    const l = Math.hypot(mx, mz);
    if (l > 0.01) {
      b.pos.x += (mx / l) * speed * dt * Math.min(1, l);
      b.pos.z += (mz / l) * speed * dt * Math.min(1, l);
      resolve(b.pos, 0.4);
      b.moving = 1;
    } else b.moving = 0;
  }

  /* ---------- multiplayer ---------- */

  private async api(body: Record<string, unknown>) {
    const r = await fetch("/api/mp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  private async joinServer() {
    if (this.joining) return;
    this.joining = true;
    try {
      const res = await this.api({ action: "join", room: this.opts.room, name: this.opts.name, team: this.opts.team });
      if (this.disposed) {
        if (res.id) this.api({ action: "leave", room: this.opts.room, id: res.id }).catch(() => {});
        return;
      }
      if (res.error) {
        this.error = res.error;
        return;
      }
      this.myId = res.id;
      this.me.team = res.team;
      this.me.kills = 0;
      this.me.deaths = 0;
      this.error = "";
      this.lastSeq = res.state.seq;
      this.round.num = -1; // force respawn on first state
      this.applyState(res.state);
      this.connected = true;
      this.updateWallhack();
    } catch {
      this.error = "Нет соединения с сервером";
    } finally {
      this.joining = false;
    }
  }

  private async netSync() {
    if (this.inflight || !this.myId || this.disposed) return;
    this.inflight = true;
    const hits = this.pendingHits.splice(0);
    const shots = this.pendingShots.splice(0, 6);
    const t0 = performance.now();
    try {
      const res = await this.api({
        action: "sync", room: this.opts.room, id: this.myId,
        x: this.me.pos.x, y: this.me.pos.y, z: this.me.pos.z, yaw: this.yaw,
        god: this.cheats.god, hits, shots, lastSeq: this.lastSeq,
      });
      this.ping = Math.round(performance.now() - t0);
      if (res.gone) {
        this.connected = false;
        this.myId = "";
        this.joinServer();
      } else {
        this.connected = true;
        this.error = "";
        this.applyState(res);
      }
    } catch {
      this.pendingHits.unshift(...hits);
      this.connected = false;
      this.error = "Потеряно соединение…";
    } finally {
      this.inflight = false;
    }
  }

  private applyState(s: {
    now: number; seq: number;
    round: { num: number; phase: Round["phase"]; endAt: number; score: { red: number; blue: number }; winner: string | null; matchWinner: Team | null };
    players: { id: string; name: string; team: Team; x: number; y: number; z: number; yaw: number; hp: number; alive: boolean; kills: number; deaths: number }[];
    events: { seq: number; t: string; id?: string; o?: number[]; d?: number[]; killer?: string; victim?: string; kTeam?: Team; head?: boolean }[];
  }) {
    const newRound = s.round.num !== this.round.num;
    this.round = {
      num: s.round.num,
      phase: s.round.phase,
      endAt: this.clock + (s.round.endAt - s.now) / 1000,
      score: s.round.score,
      winner: s.round.winner,
      matchWinner: s.round.matchWinner,
    };
    this.mpPlayers = s.players.length;
    const seen = new Set<string>();
    for (const p of s.players) {
      if (p.id === this.myId) {
        if (p.hp < this.me.hp && !this.cheats.god) {
          this.dmgT = 1;
          this.sfx("hurt");
        }
        this.me.hp = p.hp;
        this.me.kills = p.kills;
        this.me.deaths = p.deaths;
        if (newRound) {
          const sp = spawnPoint(this.me.team, Math.floor(Math.random() * 16));
          this.respawnMe(0);
          this.me.pos.set(sp.x, 0, sp.z);
        }
        if (!p.alive && this.me.alive) this.me.alive = false;
        continue;
      }
      seen.add(p.id);
      let e = this.ents.get(p.id);
      if (!e) {
        e = this.makeEnt(p.id, p.name, p.team, false);
        e.pos.set(p.x, p.y, p.z);
        this.attachMesh(e);
        this.ents.set(p.id, e);
      }
      e.target.set(p.x, p.y, p.z);
      e.yaw = p.yaw;
      e.hp = p.hp;
      e.alive = p.alive;
      e.kills = p.kills;
      e.deaths = p.deaths;
      e.name = p.name;
      if (newRound) e.pos.copy(e.target);
    }
    for (const e of [...this.ents.values()]) if (!seen.has(e.id)) this.removeEnt(e);

    for (const ev of s.events) {
      this.lastSeq = Math.max(this.lastSeq, ev.seq);
      if (ev.t === "kill") {
        this.addFeed(`${ev.killer}  ➜  ${ev.victim}${ev.head ? "  ☠" : ""}`, ev.kTeam ? TEAM_CSS[ev.kTeam] : "#fff");
        if (ev.killer === this.me.name) this.sfx("kill");
      } else if (ev.t === "shot" && ev.id !== this.myId && ev.o && ev.d) {
        const o = new THREE.Vector3(ev.o[0], ev.o[1], ev.o[2]);
        const end = o.clone().add(new THREE.Vector3(ev.d[0], ev.d[1], ev.d[2]));
        const shooter = this.ents.get(ev.id ?? "");
        this.tracer(o, end, this.botTracerMat[shooter?.team ?? "red"]);
        this.sfx("far", Math.max(0, 1 - this.me.pos.distanceTo(o) / 60) * 0.7);
      }
    }
    this.lastSeq = Math.max(this.lastSeq, s.seq);
  }

  /* ---------- main loop ---------- */

  private loop = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.clock += dt;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.drawOverlay();
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.08;
      this.cb.onHud(this.snapshot());
    }
  };

  private update(dt: number) {
    const me = this.me;
    const c = this.cheats;
    const locked = document.pointerLockElement === this.canvas;

    if (this.opts.mode === "solo") {
      this.tickRoundSolo();
    } else {
      this.netTimer -= dt;
      if (this.netTimer <= 0) {
        this.netTimer = 0.1;
        this.netSync();
      }
    }

    // timers
    this.hitT = Math.max(0, this.hitT - dt * 4);
    this.dmgT = Math.max(0, this.dmgT - dt * 2);
    this.noticeT -= dt;
    this.flashT -= dt;
    this.kick = Math.max(0, this.kick - dt * 0.6);
    this.flash.visible = this.flashT > 0;

    if (this.reloading && this.clock >= this.reloadEnd) {
      const w = WEAPONS[this.wi];
      const need = w.mag - this.mags[this.wi];
      const take = c.infAmmo ? need : Math.min(need, this.reserves[this.wi]);
      this.mags[this.wi] += take;
      if (!c.infAmmo) this.reserves[this.wi] -= take;
      this.reloading = false;
    }

    // player movement
    if (locked && this.canMove()) {
      const k = this.keys;
      let f = (k["KeyW"] ? 1 : 0) - (k["KeyS"] ? 1 : 0);
      let s = (k["KeyD"] ? 1 : 0) - (k["KeyA"] ? 1 : 0);
      const l = Math.hypot(f, s);
      if (l > 0) { f /= l; s /= l; }
      const sp = (k["ShiftLeft"] ? 8.5 : 6) * (c.speed ? 2.6 : 1) * (this.ads ? 0.6 : 1);
      const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
      const vx = (-sy * f + cy * s) * sp;
      const vz = (-cy * f - sy * s) * sp;
      me.moving = l > 0 ? 1 : 0;
      if (c.fly) {
        me.pos.x += vx * dt;
        me.pos.z += vz * dt;
        const lim = ARENA - 0.6;
        me.pos.x = Math.max(-lim, Math.min(lim, me.pos.x));
        me.pos.z = Math.max(-lim, Math.min(lim, me.pos.z));
        me.pos.y += ((k["Space"] ? 1 : 0) - (k["KeyX"] ? 1 : 0)) * sp * dt;
        me.pos.y = Math.max(0, me.pos.y);
        this.vy = 0;
        this.onGround = false;
      } else {
        me.pos.x += vx * dt;
        me.pos.z += vz * dt;
        resolve(me.pos, 0.4);
        if (k["Space"] && this.onGround) {
          this.vy = c.superJump ? 15 : 7.8;
          this.onGround = false;
        }
        this.vy -= 22 * dt;
        me.pos.y += this.vy * dt;
        const g = groundAt(me.pos.x, me.pos.z, me.pos.y - this.vy * dt);
        if (me.pos.y <= g) {
          me.pos.y = g;
          this.vy = 0;
          this.onGround = true;
        } else this.onGround = false;
      }
    } else {
      me.moving = 0;
      if (!c.fly || !me.alive) {
        this.vy -= 22 * dt;
        me.pos.y += this.vy * dt;
        const g = groundAt(me.pos.x, me.pos.z, me.pos.y - this.vy * dt);
        if (me.pos.y <= g) { me.pos.y = g; this.vy = 0; this.onGround = true; }
      }
    }

    // aimbot + shooting
    if (locked) {
      this.aimbotStep(dt);
      if (this.canShoot()) {
        const w = WEAPONS[this.wi];
        let want = c.rapid ? this.firing : w.auto ? this.firing : this.fireClick;
        if (c.autoShoot && this.crosshairOnEnemy()) want = true;
        if (c.aimbot && c.autoShoot && this.aimTarget) want = true;
        if (want) this.fireWeapon();
      }
    }
    this.fireClick = false;

    // bots
    if (this.opts.mode === "solo") {
      for (const e of this.ents.values()) if (e.ai) this.updateBot(e, dt);
    }

    // remote / bot meshes
    for (const e of this.ents.values()) {
      if (!e.mesh) continue;
      if (!e.ai) {
        const f = 1 - Math.exp(-dt * 12);
        const px = e.pos.x, pz = e.pos.z;
        e.pos.lerp(e.target, f);
        e.moving = Math.hypot(e.pos.x - px, e.pos.z - pz) / Math.max(dt, 0.001) > 0.8 ? 1 : 0;
      }
      e.mesh.position.set(e.pos.x, e.pos.y, e.pos.z);
      e.mesh.rotation.y = e.yaw;
      if (e.alive) {
        e.fall = Math.max(0, e.fall - dt * 4);
        e.mesh.rotation.x = 0;
        const sw = e.moving ? Math.sin(this.clock * 9 + e.pos.x) * 0.7 : 0;
        e.legs[0].rotation.x = sw;
        e.legs[1].rotation.x = -sw;
      } else {
        e.fall = Math.min(1, e.fall + dt * 3);
        e.mesh.rotation.x = -e.fall * (Math.PI / 2);
        e.mesh.position.y = e.pos.y + e.fall * 0.2;
      }
    }

    // tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        this.tracers.splice(i, 1);
      }
    }

    // camera
    const w = WEAPONS[this.wi];
    const targetFov = this.ads && me.alive ? 80 / w.zoom : 80;
    this.fov += (targetFov - this.fov) * Math.min(1, dt * 14);
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = me.alive ? 0 : 0.6;
    this.camera.position.set(me.pos.x, me.pos.y + (me.alive ? 1.7 : 0.45), me.pos.z);
    this.gun.visible = me.alive && !(this.ads && w.zoom >= 4);
    const bob = me.moving ? Math.sin(this.clock * 10) * 0.008 : 0;
    this.gun.position.set(this.ads ? 0.0 : 0.22, (this.ads ? -0.14 : -0.2) + bob, -0.45 + this.kick);
    this.gun.rotation.x = this.reloading ? -0.6 : this.kick * 1.5;
  }

  /* ---------- overlay (ESP / radar / FOV) ---------- */

  private drawOverlay() {
    const ctx = this.ctx;
    const W = this.overlay.width, H = this.overlay.height;
    ctx.clearRect(0, 0, W, H);
    const c = this.cheats;
    const me = this.me;

    if (c.aimbot) {
      const r = (Math.tan((c.aimFov * Math.PI) / 360) / Math.tan((this.camera.fov * Math.PI) / 360)) * (H / 2);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, Math.min(r, W), 0, Math.PI * 2);
      ctx.stroke();
    }

    if (c.esp) {
      const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
      for (const e of this.allEnts()) {
        if (e === me || !e.alive || e.team === me.team) continue;
        v1.set(e.pos.x, e.pos.y + 1.95, e.pos.z).project(this.camera);
        v2.set(e.pos.x, e.pos.y, e.pos.z).project(this.camera);
        if (v1.z > 1 || v2.z > 1) continue;
        const x1 = (v1.x * 0.5 + 0.5) * W, y1 = (-v1.y * 0.5 + 0.5) * H;
        const y2 = (-v2.y * 0.5 + 0.5) * H;
        const h = y2 - y1;
        const w = h * 0.5;
        ctx.strokeStyle = e === this.aimTarget ? "#ffff55" : "#ff3b3b";
        ctx.lineWidth = 2;
        ctx.strokeRect(x1 - w / 2, y1, w, h);
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(x1 - w / 2 - 6, y1, 4, h);
        ctx.fillStyle = e.hp > 50 ? "#4cff6a" : e.hp > 25 ? "#ffd23b" : "#ff3b3b";
        ctx.fillRect(x1 - w / 2 - 6, y1 + h * (1 - e.hp / 100), 4, h * (e.hp / 100));
        ctx.fillStyle = "#fff";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        const dist = Math.round(e.pos.distanceTo(me.pos));
        ctx.fillText(`${e.name} · ${dist}м`, x1, y1 - 4);
      }
    }

    // radar
    const cx = 100, cy = 110, R = 80, scale = R / 45;
    ctx.fillStyle = "rgba(10,14,20,0.6)";
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
    ctx.stroke();
    const sy = Math.sin(this.yaw), cyw = Math.cos(this.yaw);
    for (const e of this.allEnts()) {
      if (e === me || !e.alive) continue;
      const enemy = e.team !== me.team;
      if (enemy && !c.radar) continue;
      const rx = e.pos.x - me.pos.x, rz = e.pos.z - me.pos.z;
      const u = rx * cyw + rz * -sy;
      const v = rx * -sy + rz * -cyw;
      let px = u * scale, py = -v * scale;
      const d = Math.hypot(px, py);
      if (d > R - 4) { px = (px / d) * (R - 4); py = (py / d) * (R - 4); }
      ctx.fillStyle = enemy ? "#ff3b3b" : "#4cc2ff";
      ctx.beginPath();
      ctx.arc(cx + px, cy + py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7); ctx.lineTo(cx - 5, cy + 5); ctx.lineTo(cx + 5, cy + 5);
    ctx.closePath();
    ctx.fill();
  }

  /* ---------- HUD snapshot ---------- */

  private snapshot(): Hud {
    const c = this.counts();
    const r = this.round;
    const board: BoardRow[] = this.allEnts().map((e) => ({
      id: e.id, name: e.name, team: e.team, kills: e.kills, deaths: e.deaths, alive: e.alive, me: e === this.me,
    }));
    const w = WEAPONS[this.wi];
    return {
      mode: this.opts.mode,
      team: this.me.team,
      hp: Math.max(0, Math.round(this.me.hp)),
      alive: this.me.alive,
      weaponIdx: this.wi,
      weapons: WEAPONS.map((x) => x.name),
      mag: this.mags[this.wi],
      reserve: this.cheats.infAmmo ? -1 : this.reserves[this.wi],
      reloading: this.reloading,
      scoped: this.ads && w.zoom >= 4 && this.me.alive,
      phase: r.phase,
      roundNum: Math.max(1, r.num),
      timeLeft: Math.max(0, r.endAt - this.clock),
      score: { ...r.score },
      winner: r.winner,
      matchWinner: r.matchWinner,
      feed: this.feed.filter((f) => this.clock - f.t < 7).map((f) => ({ text: f.text, color: f.color })),
      board,
      showBoard: this.showBoard,
      cheats: { ...this.cheats },
      aliveRed: c.red,
      aliveBlue: c.blue,
      ping: this.ping,
      players: this.opts.mode === "mp" ? this.mpPlayers : this.ents.size + 1,
      hit: this.hitT,
      headHit: this.headHit,
      dmg: this.dmgT,
      notice: this.noticeT > 0 ? this.notice : "",
      error: this.opts.mode === "mp" ? this.error : "",
      connected: this.opts.mode === "solo" || this.connected,
    };
  }

  /* ---------- cleanup ---------- */

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    for (const [t, ev, fn] of this.handlers) t.removeEventListener(ev, fn);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    if (this.myId) {
      const blob = new Blob([JSON.stringify({ action: "leave", room: this.opts.room, id: this.myId })], { type: "application/json" });
      navigator.sendBeacon?.("/api/mp", blob);
    }
    this.renderer.dispose();
    this.ac?.close().catch(() => {});
  }
}

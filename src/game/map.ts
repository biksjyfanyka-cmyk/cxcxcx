export type Team = "red" | "blue";

export interface Box {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: number;
  minx: number;
  maxx: number;
  minz: number;
  maxz: number;
}

export const ARENA = 50;

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mk(x: number, z: number, w: number, d: number, h: number, color: number): Box {
  return { x, z, w, d, h, color, minx: x - w / 2, maxx: x + w / 2, minz: z - d / 2, maxz: z + d / 2 };
}

function build(): Box[] {
  const out: Box[] = [];
  const A = ARENA;
  // outer walls
  out.push(mk(0, -A - 0.5, 2 * A + 2, 1, 8, 0x2b303b));
  out.push(mk(0, A + 0.5, 2 * A + 2, 1, 8, 0x2b303b));
  out.push(mk(-A - 0.5, 0, 1, 2 * A, 8, 0x2b303b));
  out.push(mk(A + 0.5, 0, 1, 2 * A, 8, 0x2b303b));

  // center walls
  out.push(mk(-8, 0, 10, 1.5, 4, 0x8d939c));
  out.push(mk(8, 0, 10, 1.5, 4, 0x8d939c));
  out.push(mk(0, -9, 1.5, 6, 3, 0x7b818a));
  out.push(mk(0, 9, 1.5, 6, 3, 0x7b818a));

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      // L-shaped bunkers
      out.push(mk(sx * 28, sz * 14, 12, 1.5, 4, 0x9a8f7a));
      out.push(mk(sx * 22, sz * 14, 1.5, 12, 4, 0x9a8f7a));
      // pillars
      out.push(mk(sx * 12, sz * 28, 2.5, 2.5, 5, 0x6b7280));
    }
  }
  // platforms with stairs
  for (const sz of [-1, 1]) {
    out.push(mk(0, sz * 24, 10, 6, 1.5, 0x5d6b7a));
    out.push(mk(0, sz * 20, 6, 2, 1.0, 0x6d7b8a));
    out.push(mk(0, sz * 18, 6, 2, 0.5, 0x7d8b9a));
  }

  // deterministic crates
  const rnd = mulberry32(1337);
  let tries = 0;
  let placed = 0;
  while (placed < 34 && tries < 600) {
    tries++;
    const w = 1.5 + rnd() * 2;
    const d = 1.5 + rnd() * 2;
    const h = [1.0, 1.5, 2, 2.5][Math.floor(rnd() * 4)];
    const x = (rnd() * 2 - 1) * 45;
    const z = (rnd() * 2 - 1) * 34;
    const b = mk(x, z, w, d, h, [0xa0702d, 0x8a5a24, 0xb08040][Math.floor(rnd() * 3)]);
    const m = 1.8;
    const bad = out.some(
      (o) => b.minx - m < o.maxx && b.maxx + m > o.minx && b.minz - m < o.maxz && b.maxz + m > o.minz
    );
    if (bad) continue;
    out.push(b);
    placed++;
  }
  return out;
}

export const BOXES: Box[] = build();

export function spawnPoint(team: Team, i: number): { x: number; z: number; yaw: number } {
  const row = Math.floor(i / 8);
  const col = i % 8;
  const x = -21 + col * 6 + (row % 2) * 3;
  const z = team === "red" ? 43 - row * 3 : -43 + row * 3;
  return { x, z, yaw: team === "red" ? 0 : Math.PI };
}

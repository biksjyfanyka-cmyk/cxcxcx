"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Engine, Hud, StartOpts, Cheats } from "./engine";

type Team = "red" | "blue";

const CHEAT_TOGGLES: { key: keyof Cheats; label: string; hot?: string }[] = [
  { key: "aimbot", label: "Аимбот", hot: "T" },
  { key: "autoShoot", label: "Триггербот / автострельба", hot: "B" },
  { key: "wallhack", label: "Валлхак (видеть сквозь стены)", hot: "G" },
  { key: "esp", label: "ESP-рамки, HP и дистанция" },
  { key: "radar", label: "Радар (показывать врагов)" },
  { key: "god", label: "Бессмертие", hot: "H" },
  { key: "infAmmo", label: "Бесконечные патроны" },
  { key: "noRecoil", label: "Без отдачи" },
  { key: "noSpread", label: "Без разброса" },
  { key: "rapid", label: "Быстрая стрельба" },
  { key: "oneShot", label: "Убийство с одного выстрела" },
  { key: "speed", label: "Спидхак", hot: "J" },
  { key: "superJump", label: "Супер-прыжок" },
  { key: "fly", label: "Полёт (Пробел вверх / X вниз)", hot: "N" },
];

export default function Game() {
  const [opts, setOpts] = useState<StartOpts | null>(null);
  const [name, setName] = useState("Player");
  const [mode, setMode] = useState<"solo" | "mp">("solo");
  const [team, setTeam] = useState<Team | "auto">("auto");
  const [bots, setBots] = useState(6);
  const [difficulty, setDifficulty] = useState<0 | 1 | 2>(1);
  const [room, setRoom] = useState("main");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [locked, setLocked] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);
  const cheatOpenRef = useRef(false);
  const [sens, setSens] = useState(2.2);

  useEffect(() => {
    if (!opts) return;
    let cancelled = false;
    let eng: Engine | null = null;
    (async () => {
      const { Engine } = await import("./engine");
      if (cancelled || !canvasRef.current || !overlayRef.current) return;
      eng = new Engine(canvasRef.current, overlayRef.current, opts, {
        onHud: setHud,
        onLock: setLocked,
        onCheatKey: () => {
          const next = !cheatOpenRef.current;
          cheatOpenRef.current = next;
          setCheatOpen(next);
          if (next) document.exitPointerLock();
          else eng?.lock();
        },
      });
      engineRef.current = eng;
    })();
    return () => {
      cancelled = true;
      eng?.dispose();
      engineRef.current = null;
      cheatOpenRef.current = false;
      setCheatOpen(false);
      setHud(null);
      setLocked(false);
    };
  }, [opts]);

  const closeCheat = useCallback(() => {
    cheatOpenRef.current = false;
    setCheatOpen(false);
    engineRef.current?.lock();
  }, []);

  const start = () => {
    setOpts({ mode, name: name.trim() || "Player", team, bots, difficulty, room: room.trim() || "main" });
  };

  /* ------------ MENU ------------ */
  if (!opts) {
    return (
      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#1e2a44,#090c14)] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur">
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-red-500">ARENA</span> <span className="text-blue-400">STRIKE</span> 3D
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Командный 3D-шутер: красные против синих, раунды до 5 побед, боты, мультиплеер и чит-меню.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Ник
              <input
                value={name}
                maxLength={16}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white/10 px-3 py-2 outline-none focus:ring-2 ring-blue-400"
              />
            </label>
            <div className="text-sm">
              Режим
              <div className="mt-1 grid grid-cols-2 gap-2">
                {(["solo", "mp"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`rounded-lg px-3 py-2 font-semibold ${mode === m ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"}`}
                  >
                    {m === "solo" ? "С ботами" : "Мультиплеер"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm">
            Команда
            <div className="mt-1 grid grid-cols-3 gap-2">
              <button onClick={() => setTeam("red")} className={`rounded-lg px-3 py-2 font-semibold ${team === "red" ? "bg-red-600 ring-2 ring-white" : "bg-red-900/60 hover:bg-red-800"}`}>Красные</button>
              <button onClick={() => setTeam("auto")} className={`rounded-lg px-3 py-2 font-semibold ${team === "auto" ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"}`}>Авто</button>
              <button onClick={() => setTeam("blue")} className={`rounded-lg px-3 py-2 font-semibold ${team === "blue" ? "bg-blue-600 ring-2 ring-white" : "bg-blue-900/60 hover:bg-blue-800"}`}>Синие</button>
            </div>
          </div>

          {mode === "solo" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                Размер команды: <b>{bots}</b> на {bots} (боты)
                <input type="range" min={1} max={15} value={bots} onChange={(e) => setBots(+e.target.value)} className="mt-2 w-full" />
              </label>
              <div className="text-sm">
                Сложность ботов
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {["Лёгкая", "Средняя", "Сложная"].map((l, i) => (
                    <button
                      key={l}
                      onClick={() => setDifficulty(i as 0 | 1 | 2)}
                      className={`rounded-lg px-2 py-2 ${difficulty === i ? "bg-white text-black font-semibold" : "bg-white/10 hover:bg-white/20"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm">
              <label className="block">
                Код комнаты (друзья вводят тот же код)
                <input
                  value={room}
                  maxLength={16}
                  onChange={(e) => setRoom(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-white/10 px-3 py-2 outline-none focus:ring-2 ring-blue-400"
                />
              </label>
              <p className="mt-2 text-white/50">
                Раунд стартует, когда в обеих командах есть хотя бы по одному игроку. Откройте игру в двух вкладках, чтобы проверить.
              </p>
            </div>
          )}

          <button onClick={start} className="mt-6 w-full rounded-xl bg-gradient-to-r from-red-600 to-blue-600 py-3 text-lg font-black tracking-wide hover:brightness-110">
            ▶ ИГРАТЬ
          </button>

          <div className="mt-5 grid gap-x-6 gap-y-1 text-xs text-white/60 sm:grid-cols-2">
            <div><b className="text-white">WASD</b> — движение, <b className="text-white">Shift</b> — бег, <b className="text-white">Пробел</b> — прыжок</div>
            <div><b className="text-white">ЛКМ</b> — огонь, <b className="text-white">ПКМ</b> — прицел, <b className="text-white">R</b> — перезарядка</div>
            <div><b className="text-white">1–4</b> — оружие, <b className="text-white">Tab</b> — таблица</div>
            <div><b className="text-white">C</b> — чит-меню; <b className="text-white">T/G/B/H/N/J</b> — быстрые читы</div>
          </div>
        </div>
      </main>
    );
  }

  /* ------------ GAME ------------ */
  const tc = (t: Team) => (t === "red" ? "text-red-400" : "text-blue-400");
  const mm = hud ? Math.floor(hud.timeLeft / 60) : 0;
  const ss = hud ? String(Math.floor(hud.timeLeft % 60)).padStart(2, "0") : "00";

  let banner = "";
  if (hud) {
    if (hud.phase === "waiting") banner = hud.mode === "mp" ? "Ожидание игроков в другой команде…" : "";
    else if (hud.phase === "freeze") banner = `Раунд ${hud.roundNum} — приготовьтесь!`;
    else if (hud.phase === "over") {
      if (hud.matchWinner) banner = `${hud.matchWinner === "red" ? "КРАСНЫЕ" : "СИНИЕ"} ВЫИГРАЛИ МАТЧ!`;
      else banner = hud.winner === "draw" ? "Ничья в раунде" : `${hud.winner === "red" ? "Красные" : "Синие"} выиграли раунд`;
    } else if (!hud.alive) banner = "Вы погибли — ждите следующего раунда";
  }

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-black text-white">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0" />

      {hud && (
        <>
          {/* damage vignette */}
          <div className="pointer-events-none absolute inset-0" style={{ boxShadow: `inset 0 0 160px 40px rgba(255,0,0,${hud.dmg * 0.7})` }} />

          {/* sniper scope */}
          {hud.scoped && (
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at center, transparent 0, transparent 28vmin, #000 29vmin)" }}>
              <div className="absolute left-0 right-0 top-1/2 h-px bg-black" />
              <div className="absolute bottom-0 top-0 left-1/2 w-px bg-black" />
            </div>
          )}

          {/* crosshair */}
          {hud.alive && !hud.scoped && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative h-6 w-6">
                <div className="absolute left-1/2 top-0 h-2 w-0.5 -translate-x-1/2 bg-white/90" />
                <div className="absolute bottom-0 left-1/2 h-2 w-0.5 -translate-x-1/2 bg-white/90" />
                <div className="absolute left-0 top-1/2 h-0.5 w-2 -translate-y-1/2 bg-white/90" />
                <div className="absolute right-0 top-1/2 h-0.5 w-2 -translate-y-1/2 bg-white/90" />
              </div>
            </div>
          )}
          {/* hit marker */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl font-black"
            style={{ opacity: hud.hit, color: hud.headHit ? "#ff4040" : "#fff" }}
          >
            ✕
          </div>

          {/* top score */}
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-center">
            <div className="flex items-stretch overflow-hidden rounded-lg text-xl font-black shadow-lg">
              <div className="bg-red-600 px-4 py-1">{hud.score.red}</div>
              <div className="bg-black/70 px-4 py-1 tabular-nums">{mm}:{ss}</div>
              <div className="bg-blue-600 px-4 py-1">{hud.score.blue}</div>
            </div>
            <div className="mt-1 text-xs text-white/80">
              Раунд {hud.roundNum} · живы: <span className="text-red-400">{hud.aliveRed}</span> / <span className="text-blue-400">{hud.aliveBlue}</span> · до 5 побед
            </div>
          </div>

          {/* radar label */}
          <div className="pointer-events-none absolute left-3 top-[200px] text-xs text-white/70">
            Вы:{" "}
            <b className={tc(hud.team)}>{hud.team === "red" ? "красные" : "синие"}</b>
            {hud.mode === "mp" && <> · игроков {hud.players} · {hud.ping}мс</>}
          </div>

          {/* killfeed */}
          <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-1">
            {hud.feed.map((f, i) => (
              <div key={i} className="rounded bg-black/60 px-2 py-1 text-sm font-semibold" style={{ color: f.color }}>
                {f.text}
              </div>
            ))}
          </div>

          {/* notice + banner */}
          {hud.notice && (
            <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 rounded bg-black/70 px-4 py-1 text-sm font-semibold text-yellow-300">
              {hud.notice}
            </div>
          )}
          {banner && (
            <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 text-center text-3xl font-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              {banner}
            </div>
          )}
          {hud.error && (
            <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded bg-red-700 px-3 py-1 text-sm">{hud.error}</div>
          )}

          {/* bottom HUD */}
          <div className="pointer-events-none absolute bottom-4 left-4">
            <div className="text-5xl font-black drop-shadow">
              <span className={hud.hp > 30 ? "text-white" : "text-red-500"}>{hud.hp}</span>
              <span className="ml-1 text-lg text-white/60">HP</span>
            </div>
            <div className="mt-1 h-2 w-48 rounded bg-white/20">
              <div className="h-2 rounded bg-green-500" style={{ width: `${hud.hp}%` }} />
            </div>
            {hud.cheats.god && <div className="mt-1 text-xs text-yellow-300">★ БЕССМЕРТИЕ</div>}
          </div>

          <div className="pointer-events-none absolute bottom-4 right-4 text-right">
            <div className="text-5xl font-black drop-shadow">
              {hud.reloading ? <span className="text-yellow-300 text-3xl">перезарядка…</span> : hud.mag}
              <span className="ml-2 text-xl text-white/60">/ {hud.reserve < 0 ? "∞" : hud.reserve}</span>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              {hud.weapons.map((w, i) => (
                <div key={w} className={`rounded px-2 py-1 text-xs ${i === hud.weaponIdx ? "bg-white text-black font-bold" : "bg-black/50 text-white/70"}`}>
                  {i + 1} {w}
                </div>
              ))}
            </div>
          </div>

          {/* active cheats */}
          <div className="pointer-events-none absolute bottom-28 left-4 flex max-w-xs flex-wrap gap-1 text-[10px]">
            {CHEAT_TOGGLES.filter((c) => hud.cheats[c.key]).map((c) => (
              <span key={c.key} className="rounded bg-yellow-400/90 px-1.5 py-0.5 font-bold text-black">{c.label.split(" ")[0]}</span>
            ))}
          </div>

          {/* scoreboard */}
          {hud.showBoard && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 w-[min(780px,94vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-black/80 p-4">
              <div className="grid grid-cols-2 gap-4">
                {(["red", "blue"] as Team[]).map((t) => (
                  <div key={t}>
                    <div className={`mb-1 flex justify-between border-b border-white/20 pb-1 font-bold ${tc(t)}`}>
                      <span>{t === "red" ? "КРАСНЫЕ" : "СИНИЕ"}</span>
                      <span>{hud.score[t]}</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-xs text-white/50">
                      <span>Игрок</span><span>У</span><span>С</span>
                    </div>
                    {hud.board
                      .filter((r) => r.team === t)
                      .sort((a, b) => b.kills - a.kills)
                      .map((r) => (
                        <div key={r.id} className={`grid grid-cols-[1fr_auto_auto] gap-x-3 text-sm ${r.alive ? "" : "opacity-40"} ${r.me ? "font-bold text-yellow-300" : ""}`}>
                          <span className="truncate">{r.name}</span>
                          <span>{r.kills}</span>
                          <span>{r.deaths}</span>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* pause overlay */}
      {!locked && !cheatOpen && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="rounded-2xl bg-slate-900/90 p-6 text-center">
            <h2 className="text-2xl font-black">{hud ? "Пауза" : "Загрузка…"}</h2>
            <p className="mt-1 text-sm text-white/60">Кликните, чтобы захватить мышь. C — чит-меню.</p>
            <div className="mt-4 flex gap-3 justify-center">
              <button onClick={() => engineRef.current?.lock()} className="rounded-lg bg-green-600 px-5 py-2 font-bold hover:bg-green-500">Продолжить</button>
              <button onClick={() => setOpts(null)} className="rounded-lg bg-white/10 px-5 py-2 hover:bg-white/20">В меню</button>
            </div>
          </div>
        </div>
      )}

      {/* cheat panel */}
      {cheatOpen && hud && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="max-h-[92vh] w-[min(560px,94vw)] overflow-y-auto rounded-2xl border border-yellow-400/40 bg-slate-900/95 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-yellow-300">⚡ ЧИТ-МЕНЮ</h2>
              <button onClick={closeCheat} className="rounded bg-yellow-400 px-3 py-1 text-sm font-bold text-black">Закрыть (C)</button>
            </div>
            <div className="mt-3 grid gap-1 sm:grid-cols-2">
              {CHEAT_TOGGLES.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded bg-white/5 px-2 py-1.5 text-sm hover:bg-white/10">
                  <input
                    type="checkbox"
                    checked={!!hud.cheats[c.key]}
                    onChange={(e) => engineRef.current?.setCheat(c.key, e.target.checked as never)}
                  />
                  <span className="flex-1">{c.label}</span>
                  {c.hot && <kbd className="rounded bg-black/50 px-1.5 text-xs">{c.hot}</kbd>}
                </label>
              ))}
            </div>

            <h3 className="mt-4 text-sm font-bold text-white/80">Настройки аимбота</h3>
            <div className="mt-2 grid gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={hud.cheats.aimHead} onChange={(e) => engineRef.current?.setCheat("aimHead", e.target.checked)} />
                Целиться в голову
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={hud.cheats.aimVis} onChange={(e) => engineRef.current?.setCheat("aimVis", e.target.checked)} />
                Только видимые цели (не через стены)
              </label>
              <label className="block">
                FOV аимбота: {hud.cheats.aimFov}°
                <input type="range" min={5} max={180} value={hud.cheats.aimFov} onChange={(e) => engineRef.current?.setCheat("aimFov", +e.target.value)} className="w-full" />
              </label>
              <label className="block">
                Плавность: {hud.cheats.aimSmooth <= 0.01 ? "мгновенно" : hud.cheats.aimSmooth.toFixed(2)}
                <input type="range" min={0} max={0.95} step={0.05} value={hud.cheats.aimSmooth} onChange={(e) => engineRef.current?.setCheat("aimSmooth", +e.target.value)} className="w-full" />
              </label>
              <label className="block">
                Чувствительность мыши: {sens.toFixed(1)}
                <input
                  type="range" min={0.5} max={6} step={0.1} value={sens}
                  onChange={(e) => { setSens(+e.target.value); engineRef.current?.setSens(+e.target.value / 1000); }}
                  className="w-full"
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-white/50">
              Читы действуют и в мультиплеере. Для ESP/радара/валлхака враги подсвечиваются через стены.
            </p>
            <button onClick={() => setOpts(null)} className="mt-3 w-full rounded bg-white/10 py-2 text-sm hover:bg-white/20">Выйти в меню</button>
          </div>
        </div>
      )}
    </div>
  );
}

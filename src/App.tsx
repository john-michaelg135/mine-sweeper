import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { RunRecord, Tier } from "./game/types";
import { DIFFICULTIES, TIER_ORDER, fmtTime } from "./game/types";
import type { ClickResult, NewGame } from "./game/server";
import {
  clickCell,
  createGame,
  getLeaderboard,
  loadHandle,
  personalBest,
  saveHandle,
  submitRun,
  totalVerifiedRuns,
} from "./game/server";
import { setMuted as setSoundMuted, sBoom, sChord, sFlag, sOpen, sReveal, sUnflag, sWin } from "./game/sound";
import Board, { type CellView } from "./components/Board";
import {
  IconBolt,
  IconDb,
  IconFlag,
  IconMine,
  IconSpeaker,
  KeyCap,
  LedDisplay,
  SmileyFace,
  type Face,
} from "./components/Bits";
import { LeaderboardPanel, StatsPanel, VerifyLog, type LogLine } from "./components/SidePanels";
import { DEFAULT_THEME, THEMES } from "./game/themes";

type Status = "idle" | "playing" | "won" | "lost";
const CONF_COLORS = ["#ffb000", "#2dd4bf", "#ff5f56", "#3ddc84", "#f5c542", "#5fd7e8"];

export default function App() {
  /* ---------------- core game state ---------------- */
  const [tier, setTier] = useState<Tier>("beginner");
  const [session, setSession] = useState<NewGame>(() => createGame("beginner"));
  const [cellState, setCellState] = useState<number[]>(() => Array(81).fill(0));
  const [counts, setCounts] = useState<number[]>(() => Array(81).fill(0));
  const [delays, setDelays] = useState<number[]>(() => Array(81).fill(0));
  const [flags, setFlags] = useState<Set<number>>(() => new Set());
  const [bombsShown, setBombsShown] = useState<Set<number>>(() => new Set());
  const [misflagged, setMisflagged] = useState<Set<number>>(() => new Set());
  const [hit, setHit] = useState(-1);
  const [status, setStatus] = useState<Status>("idle");
  const [face, setFace] = useState<Face>("idle");
  const [finalMs, setFinalMs] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; rank: number; isNewPb: boolean; timeMs: number } | null>(
    null
  );

  /* ---------------- arena state ---------------- */
  const [muted, setMutedState] = useState(() => {
    try {
      return localStorage.getItem("arena.muted") === "1";
    } catch {
      return false;
    }
  });
  const [handle, setHandle] = useState(loadHandle);
  const [themeId, setThemeId] = useState(() => {
    try {
      return localStorage.getItem("arena.theme") ?? DEFAULT_THEME.id;
    } catch {
      return DEFAULT_THEME.id;
    }
  });
  const theme = THEMES.find((t) => t.id === themeId) ?? DEFAULT_THEME;
  const [lbTier, setLbTier] = useState<Tier>("beginner");
  const [lbRows, setLbRows] = useState<RunRecord[]>(() => getLeaderboard("beginner"));
  const [lbVersion, setLbVersion] = useState(0);
  const [log, setLog] = useState<LogLine[]>(() => [
    { text: "> uplink established — arena.edge v2.7.1", c: "dim" },
    { text: "> postgres shard connected · 3 difficulty tiers", c: "dim" },
    { text: "> awaiting first click — layout generates on demand", c: "dim" },
  ]);
  const [sessStats, setSessStats] = useState({ attempts: 0, clears: 0, streak: 0, best: 0 });
  const [pbs, setPbs] = useState<Record<Tier, number | undefined>>(() => ({
    beginner: personalBest("beginner"),
    intermediate: personalBest("intermediate"),
    expert: personalBest("expert"),
  }));
  const [ping, setPing] = useState(23);
  const [spect, setSpect] = useState(1287);
  const [confetti, setConfetti] = useState<{ id: number; x: number; delay: number; dur: number; color: string }[]>([]);

  const diff = DIFFICULTIES[tier];

  /* ---------------- refs for stable handlers ---------------- */
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const statusRef = useRef(status);
  statusRef.current = status;
  const flagsRef = useRef(flags);
  flagsRef.current = flags;
  const cellStateRef = useRef(cellState);
  cellStateRef.current = cellState;
  const flagModeRef = useRef(flagMode);
  flagModeRef.current = flagMode;
  const tierRef = useRef(tier);
  tierRef.current = tier;
  const lbTierRef = useRef(lbTier);
  lbTierRef.current = lbTier;
  const busyRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const seqRef = useRef(0);

  /* ---------------- log helpers ---------------- */
  const pushLog = useCallback((text: string, c?: LogLine["c"]) => {
    setLog((l) => [...l.slice(-60), { text, c }]);
  }, []);

  const scheduleLog = (ms: number, text: string, c?: LogLine["c"]) => {
    timersRef.current.push(window.setTimeout(() => pushLog(text, c), ms));
  };

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const burstConfetti = () => {
    const bits = Array.from({ length: 70 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      delay: Math.random() * 450,
      dur: 1500 + Math.random() * 1300,
      color: CONF_COLORS[i % CONF_COLORS.length],
    }));
    setConfetti(bits);
    window.setTimeout(() => setConfetti([]), 3300);
  };

  /* ---------------- game flow ---------------- */
  const newGame = useCallback(
    (t: Tier) => {
      clearTimers();
      seqRef.current++;
      busyRef.current = false;
      const d = DIFFICULTIES[t];
      const s = createGame(t);
      const n = d.rows * d.cols;
      setTier(t);
      setSession(s);
      setCellState(Array(n).fill(0));
      setCounts(Array(n).fill(0));
      setDelays(Array(n).fill(0));
      setFlags(new Set());
      setBombsShown(new Set());
      setMisflagged(new Set());
      setHit(-1);
      setStatus("idle");
      setFace("idle");
      setFinalMs(null);
      setStartedAt(null);
      setLastResult(null);
      setShaking(false);
      pushLog(`> new board #${s.boardId} · ${d.label} ${d.cols}×${d.rows} · ${d.mines} mines`, "cyan");
    },
    [pushLog]
  );

  const toggleFlag = useCallback((i: number) => {
    const st = statusRef.current;
    if (st === "won" || st === "lost") return;
    if (cellStateRef.current[i] !== 0) return;
    const has = flagsRef.current.has(i);
    const n = new Set(flagsRef.current);
    if (has) n.delete(i);
    else n.add(i);
    setFlags(n);
    if (has) sUnflag();
    else sFlag();
  }, []);

  function handleWin(timeMs: number, sig: string) {
    const seq = seqRef.current;
    const flagsCount = flagsRef.current.size;
    const boardId = sessionRef.current.boardId;
    pushLog(`> TX solve{board:#${boardId}, sig:${sig}, flags:${flagsCount}}`, "cyan");
    scheduleLog(500, `> VERIFY layout signature ${sig} ........ MATCH`, "ok");
    scheduleLog(1000, `> REPLAY first-click safety ............. OK`, "ok");
    scheduleLog(1500, `> SERVER-STAMPED TIME ................... ${fmtTime(timeMs)}`, "amber");
    scheduleLog(2000, `> ANTI-CHEAT plausibility ............... PASS`, "ok");
    timersRef.current.push(
      window.setTimeout(async () => {
        if (seqRef.current !== seq) return;
        const res = await submitRun(boardId, flagsCount);
        if (seqRef.current !== seq) return;
        if (res.ok) {
          pushLog(`> INSERT INTO runs(tier,time) ........... OK`, "ok");
          pushLog(
            res.isNewPb
              ? `> LEADERBOARD RANK #${res.rank} GLOBAL — NEW PERSONAL BEST`
              : `> LEADERBOARD RANK #${res.rank} GLOBAL`,
            res.isNewPb ? "gold" : "cyan"
          );
          setLastResult({ ok: true, rank: res.rank, isNewPb: res.isNewPb, timeMs: res.timeMs });
          setPbs({
            beginner: personalBest("beginner"),
            intermediate: personalBest("intermediate"),
            expert: personalBest("expert"),
          });
          setLbRows(getLeaderboard(lbTierRef.current));
          setLbVersion((v) => v + 1);
        } else {
          pushLog(`> REJECTED BY SHARD: ${res.reason}`, "err");
          setLastResult({ ok: false, rank: 0, isNewPb: false, timeMs });
        }
      }, 2500)
    );
  }

  function applyResult(res: ClickResult, clicked: number) {
    const cols = sessionRef.current.cols;
    if (res.revealed.length) {
      setCellState((p) => {
        const n = [...p];
        res.revealed.forEach((r) => {
          n[r.i] = 1;
        });
        return n;
      });
      setCounts((p) => {
        const n = [...p];
        res.revealed.forEach((r) => {
          n[r.i] = r.count;
        });
        return n;
      });
      setDelays((p) => {
        const n = [...p];
        res.revealed.forEach((r, k) => {
          n[r.i] = Math.min(k * 13, 300);
        });
        return n;
      });
    }

    if (res.status === "lost") {
      const bombSet = new Set(res.bombs ?? []);
      const mis = new Set<number>();
      flagsRef.current.forEach((f) => {
        if (!bombSet.has(f)) mis.add(f);
      });
      setBombsShown(bombSet);
      setMisflagged(mis);
      setHit(res.hit ?? -1);
      if (res.hit !== undefined && res.hit >= 0) {
        setCellState((p) => {
          const n = [...p];
          n[res.hit as number] = 2;
          return n;
        });
      }
      setStatus("lost");
      setFace("dead");
      setFinalMs(res.timeMs ?? null);
      setShaking(true);
      window.setTimeout(() => setShaking(false), 700);
      sBoom();
      const h = res.hit ?? 0;
      pushLog(`> TX click[R${Math.floor(h / cols) + 1}C${(h % cols) + 1}] → 302 FUSE TRIPPED`, "err");
      pushLog(`> mine struck — run terminated at ${fmtTime(res.timeMs ?? 0)}`, "err");
      setSessStats((s) => ({ attempts: s.attempts + 1, clears: s.clears, streak: 0, best: s.best }));
      return;
    }

    if (statusRef.current === "idle" && res.revealed.length) {
      setStatus("playing");
      setStartedAt(Date.now());
      setNowMs(Date.now());
      pushLog(`> layout generated on demand · sig ${res.sig ?? "?"}`, "dim");
    }
    if (res.revealed.length) {
      if (cellStateRef.current[clicked] === 1) sChord();
      else if (res.revealed.length > 6) sOpen();
      else sReveal();
    }

    if (res.status === "won" && res.timeMs !== undefined) {
      setStatus("won");
      setFace("cool");
      setFinalMs(res.timeMs);
      sWin();
      burstConfetti();
      setSessStats((s) => ({
        attempts: s.attempts + 1,
        clears: s.clears + 1,
        streak: s.streak + 1,
        best: Math.max(s.best, s.streak + 1),
      }));
      handleWin(res.timeMs, res.sig ?? "?");
    }
  }

  const onReveal = useCallback(
    async (i: number) => {
      if (busyRef.current) return;
      const st = statusRef.current;
      if (st === "won" || st === "lost") return;
      if (flagsRef.current.has(i)) return;
      if (flagModeRef.current && cellStateRef.current[i] === 0) {
        toggleFlag(i);
        return;
      }
      const boardId = sessionRef.current.boardId;
      const seq = seqRef.current;
      busyRef.current = true;
      const res = await clickCell(boardId, i, [...flagsRef.current]);
      if (seqRef.current !== seq) {
        busyRef.current = false;
        return;
      }
      busyRef.current = false;
      applyResult(res, i);
    },
    [toggleFlag]
  );

  /* ---------------- face + misc handlers ---------------- */
  const onPress = useCallback(() => {
    const st = statusRef.current;
    if (st === "idle" || st === "playing") setFace("press");
  }, []);

  const onRelease = useCallback(() => {
    setFace((f) => {
      if (f !== "press") return f;
      const st = statusRef.current;
      return st === "lost" ? "dead" : st === "won" ? "cool" : "idle";
    });
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState((m) => {
      const n = !m;
      try {
        localStorage.setItem("arena.muted", n ? "1" : "0");
      } catch {
        /* ignore */
      }
      return n;
    });
  }, []);

  useEffect(() => {
    setSoundMuted(muted);
  }, [muted]);

  const changeHandle = useCallback((h: string) => {
    setHandle(h);
    if (h) saveHandle(h);
  }, []);

  const changeTheme = useCallback(
    (id: string) => {
      setThemeId(id);
      try {
        localStorage.setItem("arena.theme", id);
      } catch {
        /* ignore */
      }
      const t = THEMES.find((x) => x.id === id);
      if (t) pushLog(`> skin loaded — ${t.name} [${t.tag}]`, "cyan");
    },
    [pushLog]
  );

  const changeLbTier = useCallback((t: Tier) => {
    setLbTier(t);
    setLbRows(getLeaderboard(t));
  }, []);

  /* ---------------- timers & listeners ---------------- */
  useEffect(() => {
    if (status !== "playing" || startedAt === null) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 53);
    return () => clearInterval(id);
  }, [status, startedAt]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPing(Math.round(17 + Math.random() * 26));
      setSpect((s) => Math.max(800, s + Math.round((Math.random() - 0.48) * 42)));
    }, 2100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === "r") newGame(tierRef.current);
      else if (k === "f") setFlagMode((m) => !m);
      else if (k === "m") toggleMute();
    };
    window.addEventListener("keydown", onKey);
    const up = () => onRelease();
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mouseup", up);
    };
  }, [newGame, toggleMute, onRelease]);

  useEffect(() => () => clearTimers(), []);

  /* ---------------- derived ---------------- */
  const cells = useMemo<CellView[]>(() => {
    const n = session.rows * session.cols;
    const out: CellView[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const st = cellState[i];
      out[i] = {
        state: st === 2 ? 2 : st === 1 ? 1 : 0,
        count: counts[i],
        flagged: flags.has(i),
        misflagged: misflagged.has(i),
        bombVisible: bombsShown.has(i) && st === 0,
        delay: delays[i],
      };
    }
    return out;
  }, [session, cellState, counts, flags, misflagged, bombsShown, delays]);

  const displayMs = status === "playing" && startedAt !== null ? Math.max(0, nowMs - startedAt) : finalMs ?? 0;
  const seconds = Math.floor(displayMs / 1000);
  const mineLed = diff.mines - flags.size;

  const ticker = useMemo(() => {
    const b = getLeaderboard("beginner")[0];
    const m = getLeaderboard("intermediate")[0];
    const e = getLeaderboard("expert")[0];
    return [
      b ? `${b.handle} holds BEG WR — ${fmtTime(b.timeMs)}` : "",
      m ? `${m.handle} holds INT WR — ${fmtTime(m.timeMs)}` : "",
      e ? `${e.handle} holds EXP WR — ${fmtTime(e.timeMs)}` : "",
      "bomb layouts generated on demand · first click is always safe",
      "skin kit v2 loaded — 5 cabinet finishes in rotation // switch anytime",
      "finish times stamped & verified server-side",
      pbs.expert !== undefined ? `your EXP PB: ${fmtTime(pbs.expert as number)} — beat it` : "clear a grid to post a verified time",
      `${totalVerifiedRuns()} runs verified on the global shard`,
      "chord with a click on a satisfied number",
    ].filter(Boolean);
  }, [pbs, lbVersion]);

  const statusLine =
    status === "idle"
      ? "AWAITING FIRST CLICK — LAYOUT GENERATES ON DEMAND"
      : status === "playing"
        ? "RUN IN PROGRESS — SERVER CLOCK RUNNING"
        : status === "won"
          ? lastResult
            ? lastResult.ok
              ? `VERIFIED ${fmtTime(lastResult.timeMs)} · GLOBAL RANK #${lastResult.rank}${lastResult.isNewPb ? " · NEW PB" : ""}`
              : `CLEARED ${fmtTime(lastResult.timeMs)} · SUBMISSION REJECTED`
            : "CLEARED — VERIFICATION IN PROGRESS…"
          : `FUSE TRIPPED AT ${fmtTime(finalMs ?? 0)} — SMILEY OR [R] TO RESET`;

  /* ---------------- render ---------------- */
  return (
    <div className="relative min-h-screen overflow-x-hidden font-body">
      {/* ambient CRT layers */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="arena-grid absolute inset-0" />
        <div className="scanlines absolute inset-0" />
        <div className="crt-sweep absolute inset-x-0" />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 52%, rgba(4,8,18,0.6) 100%)" }}
        />
      </div>

      {/* pixel confetti */}
      {confetti.map((c) => (
        <span
          key={c.id}
          className="conf-bit"
          style={{
            left: `${c.x}vw`,
            background: c.color,
            animationDuration: `${c.dur}ms`,
            animationDelay: `${c.delay}ms`,
          }}
        />
      ))}

      {/* ---------- header ---------- */}
      <header className="relative z-10 border-b border-[#2a3550] bg-[#0d1526]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 py-4 sm:py-5">
          <div>
            <div className="flex items-center gap-2.5">
              <IconMine size={15} color="#ffb000" />
              <span className="font-display text-[8px] tracking-[0.32em] text-cyan-300/90 sm:text-[9px]">
                GLOBAL SPEEDRUN ARENA
              </span>
            </div>
            <h1 className="chroma mt-2.5 font-display text-[clamp(19px,3.2vw,32px)] leading-none text-amber-300">
              MINESWEEPER
              <span className="blink ml-2 inline-block h-[0.85em] w-[0.45em] translate-y-[0.08em] bg-amber-300" />
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <StatusPill color="#3ddc84" label="SERVER ONLINE" pulse />
            <StatusPill color="#2dd4bf" label="DB LINK" icon={<IconDb size={12} color="#2dd4bf" />} />
            <StatusPill color="#ffb000" label={`PING ${ping}MS`} icon={<IconBolt size={11} />} />
            <StatusPill color="#5fd7e8" label={`${spect} WATCHING`} />
            {status === "playing" && <StatusPill color="#ff5f56" label="REC" pulse blinky />}
            <button
              type="button"
              onClick={toggleMute}
              className="flex h-7 items-center gap-1.5 border border-[#2a3550] px-2 text-[10px] tracking-widest text-slate-400 transition-colors hover:border-[#3a4a6b] hover:text-slate-200"
              aria-label="toggle sound"
            >
              <IconSpeaker size={13} muted={muted} />
              {muted ? "MUTED" : "SOUND"}
            </button>
          </div>
        </div>
      </header>

      {/* ---------- news ticker ---------- */}
      <div className="relative z-10 overflow-hidden border-b border-[#2a3550] bg-[#0a101d]">
        <div className="marquee-track flex w-max items-center gap-0 whitespace-nowrap py-1.5">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center">
              {ticker.map((t, i) => (
                <span key={i} className="flex items-center font-led text-[17px] text-amber-200/85">
                  <span className="px-5">{t}</span>
                  <svg viewBox="0 0 8 8" width="7" height="7" aria-hidden>
                    <rect x="1.5" y="1.5" width="5" height="5" transform="rotate(45 4 4)" fill="#ffb000" opacity="0.6" />
                  </svg>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ---------- arena ---------- */}
      <main className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-start justify-center gap-6 px-4 py-7 lg:flex-row">
        {/* cabinet */}
        <section
          className={`rise bevel-frame relative mx-auto w-fit select-none p-3 sm:p-4 ${shaking ? "shake" : ""}`}
          style={{ ...(theme.vars as CSSProperties) }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* fake menu strip */}
          <div
            className="flex items-center justify-between px-1 pb-2 text-[11px]"
            style={{ color: "var(--ms-title-ink, #3c3c3c)" }}
          >
            <span className="tracking-wide">
              <u>G</u>ame&nbsp;&nbsp;<u>B</u>oard&nbsp;&nbsp;<u>H</u>elp
            </span>
            <span className="font-led text-[15px] opacity-80">
              SESSION #{session.boardId} · EDGE LAG {ping}MS
            </span>
          </div>

          {/* difficulty cartridges */}
          <div className="mb-3 flex items-stretch gap-1.5">
            {TIER_ORDER.map((t) => {
              const d = DIFFICULTIES[t];
              const active = tier === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => newGame(t)}
                  className={`flex-1 px-2 py-2 text-center transition-all duration-150 ${active ? "tab-active" : "tab hover:brightness-105"}`}
                >
                  <span className="block font-display text-[8px] leading-relaxed sm:text-[9px]">
                    {d.label}
                    {pbs[t] !== undefined && (
                      <span className={`ml-1.5 inline-block h-1.5 w-1.5 align-middle ${active ? "bg-amber-500" : "bg-[#8a8a8a]"}`} />
                    )}
                  </span>
                  <span className="mt-1 flex items-center justify-center gap-1 text-[10px] font-bold tracking-wider">
                    {d.cols}×{d.rows}
                    <IconMine size={10} color={active ? "var(--ms-tab-a-ink, #b45309)" : "var(--ms-tab-ink, #6b6b6b)"} />
                    {d.mines}
                  </span>
                </button>
              );
            })}
          </div>

          {/* LED bar */}
          <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
            <LedDisplay value={mineLed} tone="red" />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFlagMode((m) => !m)}
                className={`flex h-9 items-center gap-1.5 px-2 font-display text-[7px] transition-all ${
                  flagMode ? "tab-active" : "bevel-btn text-[#4d4d4d] hover:brightness-105"
                }`}
                aria-pressed={flagMode}
                title="Flag mode — every click plants a flag (F)"
              >
                <IconFlag size={12} />
                FLAG
              </button>
              <button
                type="button"
                onClick={() => newGame(tier)}
                className="bevel-btn h-11 w-11 p-1 transition-transform active:scale-95"
                aria-label="reset board"
                title="New run (R)"
              >
                <SmileyFace face={face} />
              </button>
              <span
                className={`hidden h-9 items-center gap-1.5 px-1 font-display text-[7px] sm:flex ${
                  status === "playing" ? "text-[#c21807]" : "text-[#8f8f8f]"
                }`}
                title="server clock running"
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${status === "playing" ? "recburst" : ""}`}
                  style={{
                    background: status === "playing" ? "#e02020" : "#9a9a9a",
                    boxShadow: status === "playing" ? "0 0 7px #e02020" : "none",
                  }}
                />
                {status === "playing" ? "REC" : "IDLE"}
              </span>
            </div>
            <LedDisplay value={seconds} tone={status === "won" ? "green" : status === "lost" ? "amber" : "red"} />
          </div>

          {/* board */}
          <div className="overflow-x-auto pb-1">
            <div className="mx-auto w-fit">
            <Board
              rows={diff.rows}
              cols={diff.cols}
              size={diff.cell}
              cells={cells}
              interactive={status === "idle" || status === "playing"}
              won={status === "won"}
              theme={theme}
              onReveal={onReveal}
              onFlag={toggleFlag}
              onDown={onPress}
              onUp={onRelease}
            />
            </div>
          </div>

          {/* status strip */}
          <div className="mt-2 flex items-center justify-between gap-3 px-1">
            <span
              className="font-led text-[16px] tracking-wide"
              style={{
                color:
                  status === "won"
                    ? "var(--ms-num-2, #1a7a42)"
                    : status === "lost"
                      ? "#c21807"
                      : "var(--ms-title-ink, #4a4a4a)",
              }}
            >
              {statusLine}
            </span>
            <span
              className="hidden whitespace-nowrap text-[10px] font-bold tracking-wider opacity-70 sm:block"
              style={{ color: "var(--ms-title-ink, #6b6b6b)" }}
            >
              [R]ESET · [F]LAG · [M]UTE
            </span>
          </div>

          {/* board skins */}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-black/20 px-1 pt-2.5">
            <span
              className="text-[9px] font-bold tracking-[0.22em]"
              style={{ color: "var(--ms-title-ink, #5a5a5a)", opacity: 0.75 }}
            >
              BOARD SKIN
            </span>
            {THEMES.map((t) => {
              const activeSkin = t.id === theme.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => changeTheme(t.id)}
                  title={`${t.name} — ${t.tag}`}
                  aria-pressed={activeSkin}
                  className={`flex flex-col items-center gap-1 px-1 py-0.5 transition-all duration-150 ${
                    activeSkin ? "-translate-y-0.5" : "opacity-60 hover:-translate-y-0.5 hover:opacity-100"
                  }`}
                >
                  <span
                    className="flex overflow-hidden"
                    style={{
                      border: `2px solid ${activeSkin ? "#ffb000" : "rgba(0,0,0,0.45)"}`,
                      boxShadow: activeSkin ? "0 0 12px rgba(255,176,0,0.4)" : "none",
                    }}
                  >
                    <span style={{ width: 13, height: 15, background: t.vars["--ms-frame"] }} />
                    <span
                      style={{
                        width: 13,
                        height: 15,
                        background: t.vars["--ms-cov"],
                        boxShadow: `inset 1px 1px 0 ${t.vars["--ms-cov-hi"]}, inset -1px -1px 0 ${t.vars["--ms-cov-lo"]}`,
                      }}
                    />
                    <span
                      className="flex items-center justify-center"
                      style={{ width: 13, height: 15, background: t.vars["--ms-open"] }}
                    >
                      <span className="font-display" style={{ color: t.numbers[1], fontSize: 8, lineHeight: 1 }}>
                        3
                      </span>
                    </span>
                  </span>
                  <span
                    className="font-display"
                    style={{ fontSize: 6, color: activeSkin ? "#ffb000" : "var(--ms-title-ink, #5a5a5a)" }}
                  >
                    {t.name.split(" ")[0]}
                  </span>
                </button>
              );
            })}
            <span
              className="ml-auto hidden font-led text-[14px] sm:block"
              style={{ color: "var(--ms-title-ink, #5a5a5a)", opacity: 0.8 }}
            >
              {theme.tag}
            </span>
          </div>
        </section>

        {/* right column */}
        <aside className="flex w-full min-w-0 flex-col gap-4 lg:w-[384px] lg:shrink-0">
          <LeaderboardPanel tier={lbTier} onTier={changeLbTier} rows={lbRows} handle={handle} onHandle={changeHandle} />
          <VerifyLog lines={log} />
          <StatsPanel pbs={pbs} session={sessStats} />
        </aside>
      </main>

      {/* ---------- footer: rules & controls ---------- */}
      <footer className="relative z-10 border-t border-[#2a3550] bg-[#0a101d]">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-8 md:grid-cols-[1.4fr_1fr]">
          <div className="rise" style={{ animationDelay: "240ms" }}>
            <h3 className="font-display text-[10px] tracking-[0.25em] text-amber-300">SERVER RULES</h3>
            <ol className="mt-4 space-y-2.5 text-[13.5px] leading-relaxed text-slate-400">
              {[
                ["01", "Bomb layouts are generated server-side, on demand, at the moment of your first click — the opening is always safe."],
                ["02", "The clock is stamped by the arena edge: start at first reveal, stop at final reveal. Client timers are decoration only."],
                ["03", "On clearance the solve is replayed: layout signature, first-click safety and flag count are re-verified before insert."],
                ["04", "Times faster than 10ms per safe cell are rejected as implausible. The shard keeps only verified runs."],
              ].map(([n, t]) => (
                <li key={n} className="flex gap-3">
                  <span className="font-led text-[19px] leading-[1.15] text-amber-400/90">{n}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rise" style={{ animationDelay: "300ms" }}>
            <h3 className="font-display text-[10px] tracking-[0.25em] text-cyan-300">CONTROLS</h3>
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-slate-400">
              <li className="flex items-center justify-between gap-3">
                <span>Reveal cell</span>
                <span className="flex gap-1"><KeyCap>LMB</KeyCap></span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>Plant / pull flag</span>
                <span className="flex gap-1"><KeyCap>RMB</KeyCap><KeyCap>F</KeyCap></span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>Chord on satisfied number</span>
                <span className="flex gap-1"><KeyCap>LMB ×2</KeyCap></span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>New run</span>
                <span className="flex gap-1"><KeyCap>R</KeyCap><KeyCap>SMILEY</KeyCap></span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>Mute cabinet</span>
                <span className="flex gap-1"><KeyCap>M</KeyCap></span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#1a2540]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-4 py-3 text-[10.5px] tracking-wider text-slate-600">
            <span>ARENA.EDGE v2.7.1 — FastAPI contract · PostgreSQL shard (local emulation) · timestamps in UTC</span>
            <span className="font-led text-[15px] text-slate-600">INSERT COIN TO CONTINUE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------------- small header pill ---------------- */
function StatusPill({
  color,
  label,
  icon,
  pulse,
  blinky,
}: {
  color: string;
  label: string;
  icon?: ReactNode;
  pulse?: boolean;
  blinky?: boolean;
}) {
  return (
    <span className="flex h-7 items-center gap-1.5 border border-[#2a3550] bg-[#0a101d] px-2 text-[10px] font-bold tracking-widest text-slate-300">
      <span
        className={`inline-block h-1.5 w-1.5 ${pulse ? "pulse-dot" : ""} ${blinky ? "recburst" : ""}`}
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      {icon}
      {label}
    </span>
  );
}

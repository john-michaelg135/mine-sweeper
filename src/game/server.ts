/* Mock "arena edge" — mirrors the FastAPI contract:
 *   POST /game            → createGame()
 *   POST /game/{id}/click → clickCell()      (server holds the bomb layout, stamps the clock)
 *   POST /game/{id}/solve → submitRun()      (validates win state, inserts into the runs table)
 *   GET  /leaderboard     → getLeaderboard() (PostgreSQL shard emulated with localStorage)
 */
import type { DifficultyDef, RunRecord, Tier } from "./types";
import { DIFFICULTIES } from "./types";
import { countAround, floodReveal, neighborsOf, placeBombs, type RevealCell } from "./engine";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const lag = () => sleep(14 + Math.random() * 26);

export interface NewGame {
  boardId: string;
  rows: number;
  cols: number;
  mines: number;
}

export interface ClickResult {
  status: "playing" | "won" | "lost";
  revealed: RevealCell[];
  hit?: number;
  bombs?: number[];
  timeMs?: number;
  sig?: string;
  safeTotal?: number;
}

export interface SubmitResult {
  ok: boolean;
  timeMs: number;
  rank: number;
  total: number;
  isNewPb: boolean;
  prevBest?: number;
  reason?: string;
}

interface ServerBoard {
  id: string;
  diff: DifficultyDef;
  bombs: Set<number> | null;
  status: "playing" | "won" | "lost";
  startedAt: number | null;
  finishedAt: number | null;
  timeMs: number | null;
  sig: string;
  revealed: Set<number>;
}

const boards = new Map<string, ServerBoard>();

function hashBombs(bombs: Set<number>): string {
  let h = 5381;
  bombs.forEach((b) => {
    h = ((h * 33) ^ b) >>> 0;
  });
  return "0x" + h.toString(16).toUpperCase().padStart(8, "0");
}

export function createGame(tier: Tier): NewGame {
  const d = DIFFICULTIES[tier];
  const id = Math.random().toString(16).slice(2, 6).toUpperCase();
  boards.set(id, {
    id,
    diff: d,
    bombs: null,
    status: "playing",
    startedAt: null,
    finishedAt: null,
    timeMs: null,
    sig: "",
    revealed: new Set(),
  });
  return { boardId: id, rows: d.rows, cols: d.cols, mines: d.mines };
}

/** Authoritative click: the client never sees the layout until it loses or wins. */
export async function clickCell(boardId: string, i: number, flags: number[]): Promise<ClickResult> {
  await lag();
  const b = boards.get(boardId);
  if (!b || b.status !== "playing") return { status: b?.status ?? "lost", revealed: [] };
  const { rows, cols, mines } = b.diff;

  // Bomb layout is generated on demand, at the moment of the first click.
  if (!b.bombs) {
    b.bombs = placeBombs(rows, cols, mines, i);
    b.startedAt = Date.now(); // server-stamped start
    b.sig = hashBombs(b.bombs);
  }
  const bombs = b.bombs;
  const flagSet = new Set(flags);
  const out: RevealCell[] = [];
  let hit = -1;

  const flood = (start: number) => {
    for (const r of floodReveal(bombs, rows, cols, start)) {
      if (!b.revealed.has(r.i)) {
        b.revealed.add(r.i);
        out.push(r);
      }
    }
  };

  if (b.revealed.has(i)) {
    // Chord: flags around the number match → open every covered, unflagged neighbor.
    const count = countAround(bombs, i, rows, cols);
    const around = neighborsOf(i, rows, cols);
    const flaggedAround = around.filter((n) => flagSet.has(n)).length;
    if (flaggedAround === count) {
      for (const nb of around) {
        if (b.revealed.has(nb) || flagSet.has(nb)) continue;
        if (bombs.has(nb)) {
          hit = nb;
          break;
        }
      }
      if (hit < 0) {
        for (const nb of around) {
          if (b.revealed.has(nb) || flagSet.has(nb)) continue;
          flood(nb);
        }
      }
    }
  } else if (bombs.has(i)) {
    hit = i;
  } else {
    flood(i);
  }

  if (hit >= 0) {
    b.status = "lost";
    b.finishedAt = Date.now();
    b.timeMs = b.finishedAt - (b.startedAt ?? b.finishedAt);
    return { status: "lost", revealed: out, hit, bombs: [...bombs], timeMs: b.timeMs, sig: b.sig };
  }

  const safeTotal = rows * cols - mines;
  if (b.revealed.size >= safeTotal) {
    b.status = "won";
    b.finishedAt = Date.now(); // server-stamped finish
    b.timeMs = b.finishedAt - (b.startedAt ?? b.finishedAt);
    return { status: "won", revealed: out, timeMs: b.timeMs, sig: b.sig, safeTotal };
  }
  return { status: "playing", revealed: out, safeTotal };
}

/* ---------------- "PostgreSQL shard" ---------------- */

const LS_RUNS = "arena.runs.v2";
const LS_HANDLE = "arena.handle.v1";

export function loadHandle(): string {
  try {
    return localStorage.getItem(LS_HANDLE) || "RUNNER_01";
  } catch {
    return "RUNNER_01";
  }
}
export function saveHandle(h: string) {
  try {
    localStorage.setItem(LS_HANDLE, h);
  } catch {
    /* ignore */
  }
}

function loadRuns(): RunRecord[] {
  try {
    const raw = localStorage.getItem(LS_RUNS);
    return raw ? (JSON.parse(raw) as RunRecord[]) : [];
  } catch {
    return [];
  }
}
function saveRuns(r: RunRecord[]) {
  try {
    localStorage.setItem(LS_RUNS, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

const DAY = 86400000;
const NOW = Date.now();
const mk = (handle: string, tier: Tier, timeMs: number, region: string, daysAgo: number): RunRecord => ({
  id: `s-${handle}-${tier}-${timeMs}`,
  handle,
  tier,
  timeMs,
  region,
  at: NOW - daysAgo * DAY,
});

const SEEDS: RunRecord[] = [
  // BEGINNER 9×9 · 10 mines
  mk("GODSPEED", "beginner", 5870, "JP", 2),
  mk("clr_k1ng", "beginner", 7420, "US", 5),
  mk("sweeper99", "beginner", 9150, "DE", 1),
  mk("n0va", "beginner", 11030, "SE", 9),
  mk("pixel_pete", "beginner", 14600, "CA", 3),
  mk("daisycutter", "beginner", 18200, "UK", 12),
  mk("flagTheory", "beginner", 22900, "KR", 6),
  mk("0xDEFUSE", "beginner", 27500, "BR", 4),
  mk("MS_HANZO", "beginner", 31400, "FR", 15),
  mk("boomdodger", "beginner", 36800, "PL", 7),
  // INTERMEDIATE 16×16 · 40 mines
  mk("clr_k1ng", "intermediate", 28940, "US", 4),
  mk("GODSPEED", "intermediate", 33100, "JP", 1),
  mk("clickwizard", "intermediate", 41720, "NO", 8),
  mk("sweeper99", "intermediate", 47250, "DE", 2),
  mk("TAP_TAP_1337", "intermediate", 55400, "TW", 6),
  mk("n0va", "intermediate", 63810, "SE", 11),
  mk("flagTheory", "intermediate", 74900, "KR", 3),
  mk("daisycutter", "intermediate", 88260, "UK", 14),
  mk("0xDEFUSE", "intermediate", 101500, "BR", 5),
  mk("pixel_pete", "intermediate", 118700, "CA", 10),
  // EXPERT 30×16 · 99 mines
  mk("GODSPEED", "expert", 61340, "JP", 3),
  mk("clr_k1ng", "expert", 74820, "US", 1),
  mk("MS_HANZO", "expert", 90110, "FR", 7),
  mk("clickwizard", "expert", 104650, "NO", 2),
  mk("sweeper99", "expert", 122400, "DE", 9),
  mk("TAP_TAP_1337", "expert", 141900, "TW", 4),
  mk("n0va", "expert", 163250, "SE", 13),
  mk("flagTheory", "expert", 190800, "KR", 6),
  mk("boomdodger", "expert", 224100, "PL", 8),
  mk("daisycutter", "expert", 262400, "UK", 16),
];

export function getLeaderboard(tier: Tier): RunRecord[] {
  const all = [...SEEDS.filter((r) => r.tier === tier), ...loadRuns().filter((r) => r.tier === tier)];
  all.sort((a, b) => a.timeMs - b.timeMs);
  return all.slice(0, 50);
}

export function personalBest(tier: Tier): number | undefined {
  const runs = loadRuns().filter((r) => r.tier === tier);
  return runs.length ? Math.min(...runs.map((r) => r.timeMs)) : undefined;
}

export function totalVerifiedRuns(): number {
  return SEEDS.length + loadRuns().length;
}

/** Win-state validation + insert into the runs table. Returns global rank for the tier. */
export async function submitRun(boardId: string, flagsCount: number): Promise<SubmitResult> {
  await sleep(380 + Math.random() * 420); // the "verification pass"
  const b = boards.get(boardId);
  if (!b || b.status !== "won" || !b.timeMs) {
    return { ok: false, timeMs: 0, rank: 0, total: 0, isNewPb: false, reason: "NO_VALID_RUN" };
  }
  const { rows, cols, mines, tier } = b.diff;
  if (flagsCount > mines) {
    return { ok: false, timeMs: b.timeMs, rank: 0, total: 0, isNewPb: false, reason: "FLAG_COUNT_EXCEEDS_MINES" };
  }
  const safe = rows * cols - mines;
  if (b.timeMs < safe * 10) {
    // faster than 10ms per safe cell — physically impossible click rate
    return { ok: false, timeMs: b.timeMs, rank: 0, total: 0, isNewPb: false, reason: "IMPLAUSIBLE_TIME" };
  }

  const stored = loadRuns();
  const prevBest = stored.filter((r) => r.tier === tier).reduce((m, r) => Math.min(m, r.timeMs), Infinity);
  const rec: RunRecord = {
    id: "u" + Date.now().toString(36) + Math.floor(Math.random() * 999),
    handle: loadHandle(),
    tier,
    timeMs: b.timeMs,
    at: Date.now(),
    region: "YOU",
    you: true,
  };
  stored.push(rec);
  saveRuns(stored);

  const lb = getLeaderboard(tier);
  const rank = lb.findIndex((r) => r.id === rec.id) + 1;
  return {
    ok: true,
    timeMs: b.timeMs,
    rank,
    total: lb.length,
    isNewPb: b.timeMs < prevBest,
    prevBest: prevBest === Infinity ? undefined : prevBest,
  };
}

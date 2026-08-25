export type Tier = "beginner" | "intermediate" | "expert";

export interface DifficultyDef {
  tier: Tier;
  label: string;
  short: string;
  rows: number;
  cols: number;
  mines: number;
  cell: number;
}

export const DIFFICULTIES: Record<Tier, DifficultyDef> = {
  beginner: { tier: "beginner", label: "BEGINNER", short: "BEG", rows: 9, cols: 9, mines: 10, cell: 34 },
  intermediate: { tier: "intermediate", label: "INTERMEDIATE", short: "INT", rows: 16, cols: 16, mines: 40, cell: 26 },
  expert: { tier: "expert", label: "EXPERT", short: "EXP", rows: 16, cols: 30, mines: 99, cell: 21 },
};

export const TIER_ORDER: Tier[] = ["beginner", "intermediate", "expert"];

export const NUM_COLORS = [
  "",
  "#1e53e5",
  "#177b26",
  "#e02020",
  "#1b2391",
  "#8a1b1b",
  "#0e8a8a",
  "#161616",
  "#7a7a7a",
];

export interface RunRecord {
  id: string;
  handle: string;
  tier: Tier;
  timeMs: number;
  at: number;
  region: string;
  you?: boolean;
}

export function fmtTime(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(2)}s`;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(2).padStart(5, "0")}`;
}

export function fmtClock(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(2)}s`;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(2).padStart(5, "0")}`;
}

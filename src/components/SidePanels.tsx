import { useEffect, useRef } from "react";
import type { RunRecord, Tier } from "../game/types";
import { DIFFICULTIES, TIER_ORDER, fmtTime } from "../game/types";
import { IconDb, IconTrophy } from "./Bits";

export interface LogLine {
  text: string;
  c?: "dim" | "ok" | "err" | "cyan" | "amber" | "gold";
}

const LOG_COLOR: Record<string, string> = {
  ok: "#3ddc84",
  err: "#ff5f56",
  cyan: "#5fd7e8",
  amber: "#ffb000",
  gold: "#f5c542",
  dim: "#8a713f",
};

/* ---------------- verification terminal ---------------- */
export function VerifyLog({ lines }: { lines: LogLine[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);
  return (
    <section className="rise border border-[#26334f] bg-[#120c04]" style={{ animationDelay: "140ms" }}>
      <header className="flex items-center justify-between border-b border-[#3a2c12] bg-[#1a1206] px-3 py-2">
        <h2 className="font-display text-[9px] tracking-[0.22em] text-[#ffb000]">UPLINK // VERIFY.LOG</h2>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 bg-[#3ddc84]" />
          <span className="h-1.5 w-1.5 bg-[#ffb000]" />
          <span className="h-1.5 w-1.5 bg-[#ff5f56]" />
        </span>
      </header>
      <div ref={ref} className="h-44 overflow-y-auto px-3 py-2 font-led text-[17px] leading-[1.3]">
        {lines.map((l, i) => (
          <div key={i} style={{ color: LOG_COLOR[l.c ?? "amber"] }}>
            {l.text}
          </div>
        ))}
        <div className="text-[#ffb000]">
          <span className="blink">▊</span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- leaderboard ---------------- */
const RANK_COLOR = ["#f5c542", "#c9d1d9", "#d08b4c"];

interface LbProps {
  tier: Tier;
  onTier: (t: Tier) => void;
  rows: RunRecord[];
  handle: string;
  onHandle: (h: string) => void;
}

export function LeaderboardPanel({ tier, onTier, rows, handle, onHandle }: LbProps) {
  const d = DIFFICULTIES[tier];
  const leader = rows[0];
  return (
    <section className="rise border border-[#26334f] bg-[#101a2e]" style={{ animationDelay: "70ms" }}>
      <header className="flex items-center justify-between border-b border-[#26334f] px-3 py-2">
        <h2 className="font-display text-[9px] tracking-[0.22em] text-[#5fd7e8]">GLOBAL LEADERBOARD</h2>
        <IconTrophy />
      </header>

      <div className="flex items-center gap-1.5 border-b border-[#26334f] px-3 py-2">
        {TIER_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTier(t)}
            className={`px-2 py-1.5 font-display text-[8px] tracking-wider transition-all duration-150 ${
              tier === t
                ? "border border-amber-400/70 bg-[#1d2c4d] text-amber-300 shadow-[0_0_12px_rgba(255,176,0,0.15)]"
                : "border border-[#26334f] text-slate-500 hover:border-[#3a4a6b] hover:text-slate-300"
            }`}
          >
            {DIFFICULTIES[t].short}
          </button>
        ))}
        <span className="ml-auto text-[10px] tracking-widest text-slate-500">
          {d.cols}×{d.rows} · {d.mines} MINES
        </span>
      </div>

      <div className="flex items-center gap-2 border-b border-[#26334f] px-3 py-1.5">
        <span className="text-[9px] tracking-[0.2em] text-slate-500">HANDLE</span>
        <input
          value={handle}
          onChange={(e) => onHandle(e.target.value.toUpperCase().replace(/[^A-Z0-9_\-]/g, "").slice(0, 14))}
          spellCheck={false}
          className="min-w-0 flex-1 border-b border-dashed border-[#3a4a6b] bg-transparent font-led text-[19px] leading-tight text-amber-300 outline-none transition-colors focus:border-amber-400"
          aria-label="player handle"
        />
        <span className="whitespace-nowrap text-[10px] tracking-widest text-slate-600">{rows.length} VERIFIED</span>
      </div>

      <ol className="max-h-[338px] overflow-y-auto">
        {rows.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-slate-500">no verified runs yet — set the first time</li>
        )}
        {rows.map((r, i) => {
          const rank = i + 1;
          const isLeader = i === 0;
          const delta = leader && !isLeader ? r.timeMs - leader.timeMs : 0;
          return (
            <li
              key={r.id}
              className={`grid grid-cols-[30px_1fr_auto] items-center gap-2 border-b border-[#1a2540] px-3 py-[7px] transition-colors hover:bg-[#16223c] ${
                r.you ? "border-l-2 border-l-amber-400 bg-amber-400/10" : ""
              }`}
            >
              <span
                className="font-display text-[9px]"
                style={{ color: rank <= 3 ? RANK_COLOR[rank - 1] : "#5a6885" }}
              >
                {String(rank).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className={`truncate text-[13px] font-bold ${
                    r.you ? "text-amber-300" : isLeader ? "text-cyan-300" : "text-slate-200"
                  }`}
                >
                  {r.handle}
                </span>
                <span className="border border-[#2a3a5c] px-1 text-[9px] tracking-wider text-slate-500">{r.region}</span>
                {isLeader && (
                  <span className="border border-amber-400/50 px-1 font-display text-[7px] text-amber-300">WR</span>
                )}
              </span>
              <span className="text-right">
                <span
                  className="block font-led text-[21px] leading-none"
                  style={{ color: isLeader ? "#5fd7e8" : r.you ? "#ffd27a" : "#d8cba0" }}
                >
                  {fmtTime(r.timeMs)}
                </span>
                {!isLeader && (
                  <span className="text-[9px] text-slate-600">+{(delta / 1000).toFixed(2)}</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------------- telemetry ---------------- */
interface StatsProps {
  pbs: Record<Tier, number | undefined>;
  session: { attempts: number; clears: number; streak: number; best: number };
}

export function StatsPanel({ pbs, session }: StatsProps) {
  const winRate = session.attempts ? Math.round((session.clears / session.attempts) * 100) : 0;
  return (
    <section className="rise border border-[#26334f] bg-[#101a2e]" style={{ animationDelay: "200ms" }}>
      <header className="flex items-center justify-between border-b border-[#26334f] px-3 py-2">
        <h2 className="font-display text-[9px] tracking-[0.22em] text-[#3ddc84]">RUNNER TELEMETRY</h2>
        <IconDb />
      </header>
      <div className="grid grid-cols-3 divide-x divide-[#26334f]">
        {TIER_ORDER.map((t) => (
          <div key={t} className="px-3 py-2.5">
            <div className="text-[9px] tracking-[0.18em] text-slate-500">{DIFFICULTIES[t].short} PB</div>
            <div className="font-led text-[23px] leading-tight text-amber-300">
              {pbs[t] !== undefined ? fmtTime(pbs[t] as number) : "--.--"}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 divide-x divide-[#26334f] border-t border-[#26334f] text-center">
        {[
          ["ATTEMPTS", String(session.attempts)],
          ["CLEARS", String(session.clears)],
          ["WIN RATE", `${winRate}%`],
          ["STREAK", `${session.streak}◆${session.best}`],
        ].map(([k, v]) => (
          <div key={k} className="px-1 py-2">
            <div className="text-[8px] tracking-[0.14em] text-slate-500">{k}</div>
            <div className="font-led text-[19px] leading-tight text-cyan-300">{v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

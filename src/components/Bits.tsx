import { memo, type ReactNode } from "react";

/* ---------- LED 7-segment-ish display ---------- */
export const LedDisplay = memo(function LedDisplay({
  value,
  digits = 3,
  tone = "red",
  height = 40,
}: {
  value: number;
  digits?: number;
  tone?: "red" | "green" | "amber";
  height?: number;
}) {
  const neg = value < 0;
  let v = Math.abs(Math.round(value));
  const max = 10 ** digits - 1;
  if (v > max) v = max;
  const txt = (neg ? "-" : "") + String(v).padStart(neg ? digits - 1 : digits, "0");
  const color = tone === "red" ? "#ff3b30" : tone === "green" ? "#3ddc84" : "#ffb000";
  const fontSize = Math.round(height * 0.78);
  return (
    <div
      className="led-well relative flex items-center justify-center overflow-hidden px-2"
      style={{ height, minWidth: digits * fontSize * 0.52 + 20 }}
    >
      <span
        aria-hidden
        className="font-led absolute select-none"
        style={{ fontSize, color: `${color}1c`, letterSpacing: 2, top: "50%", transform: "translateY(-54%)" }}
      >
        {"8".repeat(digits)}
      </span>
      <span
        className="font-led led-flicker relative"
        style={{ fontSize, color, textShadow: `0 0 10px ${color}aa, 0 0 2px ${color}`, letterSpacing: 2, lineHeight: 1 }}
      >
        {txt}
      </span>
    </div>
  );
});

/* ---------- Smiley ---------- */
export type Face = "idle" | "press" | "dead" | "cool";

export function SmileyFace({ face }: { face: Face }) {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <circle cx="20" cy="20" r="17" fill="#ffd93b" stroke="#8a6d00" strokeWidth="1.6" />
      <circle cx="20" cy="20" r="14.5" fill="none" stroke="#ffe98a" strokeWidth="1.4" opacity="0.8" />
      {face === "dead" ? (
        <>
          <path d="M10.5 11.5l5 5M15.5 11.5l-5 5" stroke="#3a2c00" strokeWidth="2" strokeLinecap="round" />
          <path d="M24.5 11.5l5 5M29.5 11.5l-5 5" stroke="#3a2c00" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 28q2-2.4 4 0t4 0 4 0" fill="none" stroke="#3a2c00" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : face === "cool" ? (
        <>
          <rect x="8.5" y="11.5" width="10" height="6.4" rx="1.2" fill="#151515" />
          <rect x="21.5" y="11.5" width="10" height="6.4" rx="1.2" fill="#151515" />
          <rect x="17.5" y="13.4" width="5" height="1.8" fill="#151515" />
          <path d="M10 13.2l3-0.4" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
          <path d="M13 25.5q7 5 14 0" fill="none" stroke="#3a2c00" strokeWidth="2.2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="14" cy="14.5" rx="2.1" ry={face === "press" ? 2.8 : 2.3} fill="#3a2c00" />
          <ellipse cx="26" cy="14.5" rx="2.1" ry={face === "press" ? 2.8 : 2.3} fill="#3a2c00" />
          {face === "press" ? (
            <ellipse cx="20" cy="26" rx="3.4" ry="4.2" fill="#3a2c00" />
          ) : (
            <path d="M12.5 24.5q7.5 6 15 0" fill="none" stroke="#3a2c00" strokeWidth="2.2" strokeLinecap="round" />
          )}
        </>
      )}
    </svg>
  );
}

/* ---------- Pixel icons (inline SVG, no emoji) ---------- */
export function IconMine({ size = 16, color = "#141414" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden>
      <g stroke={color} strokeWidth="1.7" strokeLinecap="round">
        <path d="M10 2.2v3M10 14.8v3M2.2 10h3M14.8 10h3M4.5 4.5l2.1 2.1M13.4 13.4l2.1 2.1M15.5 4.5l-2.1 2.1M6.6 13.4l-2.1 2.1" />
      </g>
      <circle cx="10" cy="10" r="4.6" fill={color} />
      <circle cx="8.4" cy="8.4" r="1.2" fill="#ffffff" opacity="0.85" />
    </svg>
  );
}

export function IconFlag({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden>
      <rect x="9.2" y="3" width="1.8" height="12" fill="#1c1c1c" />
      <path d="M11 3.4l6 2.8-6 2.8z" fill="#e02020" />
      <rect x="5.5" y="15" width="9" height="2.2" fill="#1c1c1c" />
    </svg>
  );
}

export function IconTrophy({ size = 14, color = "#f5c542" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden>
      <path d="M5 3h10v4a5 5 0 01-10 0z" fill={color} />
      <path d="M5 4H2.5v1.5A3.5 3.5 0 006 9M15 4h2.5v1.5A3.5 3.5 0 0114 9" fill="none" stroke={color} strokeWidth="1.6" />
      <rect x="9" y="11.6" width="2" height="2.6" fill={color} />
      <rect x="6.5" y="14.2" width="7" height="2.4" fill={color} />
    </svg>
  );
}

export function IconDb({ size = 13, color = "#2dd4bf" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden>
      <ellipse cx="10" cy="4.6" rx="6.4" ry="2.6" fill="none" stroke={color} strokeWidth="1.6" />
      <path d="M3.6 4.6v10.8c0 1.4 2.9 2.6 6.4 2.6s6.4-1.2 6.4-2.6V4.6" fill="none" stroke={color} strokeWidth="1.6" />
      <path d="M3.6 10c0 1.4 2.9 2.6 6.4 2.6s6.4-1.2 6.4-2.6" fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

export function IconBolt({ size = 12, color = "#ffb000" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden>
      <path d="M11.5 2L5 11h4l-1.5 7L15 9h-4.5z" fill={color} />
    </svg>
  );
}

export function IconSpeaker({ size = 14, muted = false }: { size?: number; muted?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden>
      <path d="M3 8v4h3l4 3.4V4.6L6 8z" fill="currentColor" />
      {muted ? (
        <path d="M12.5 7.5l5 5M17.5 7.5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M12.5 7a4 4 0 010 6M14.8 5a7 7 0 010 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

/* ---------- Keycap ---------- */
export function KeyCap({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block border border-[#3a4a6b] bg-[#182340] px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-200 shadow-[0_2px_0_#0a1120]">
      {children}
    </span>
  );
}

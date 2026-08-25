import { memo } from "react";
import type { BoardTheme } from "../game/themes";
import { IconFlag, IconMine } from "./Bits";

export interface CellView {
  state: 0 | 1 | 2; // 0 covered · 1 revealed · 2 exploded
  count: number;
  flagged: boolean;
  misflagged: boolean;
  bombVisible: boolean;
  delay: number;
}

interface CellProps {
  v: CellView;
  size: number;
  interactive: boolean;
  theme: BoardTheme;
  onReveal: () => void;
  onFlag: () => void;
  onDown: () => void;
  onUp: () => void;
}

const Cell = memo(function Cell({ v, size, interactive, theme, onReveal, onFlag, onDown, onUp }: CellProps) {
  const { state, count, flagged, misflagged, bombVisible, delay } = v;
  const icon = Math.round(size * 0.56);

  if (state === 0) {
    return (
      <button
        type="button"
        disabled={!interactive}
        className="cell-covered relative flex items-center justify-center"
        style={{ width: size, height: size }}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => {
          e.preventDefault();
          onDown();
          if (e.button === 2) onFlag();
        }}
        onMouseUp={onUp}
        onClick={(e) => {
          if (e.button === 0) onReveal();
        }}
        aria-label={flagged ? "flagged cell" : "covered cell"}
      >
        {misflagged ? (
          <span className="relative flex items-center justify-center">
            <IconMine size={icon} color={theme.inkDim} />
            <svg className="absolute" viewBox="0 0 20 20" width={icon + 4} height={icon + 4} aria-hidden>
              <path d="M4 4l12 12M16 4L4 16" stroke="#e02020" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
        ) : flagged ? (
          <span className="flag-pop">
            <IconFlag size={icon} ink={theme.ink} />
          </span>
        ) : bombVisible ? (
          <IconMine size={icon} color={theme.ink} />
        ) : null}
      </button>
    );
  }

  const isHit = state === 2;
  const fontSize = Math.max(8, Math.round(size * 0.4));
  return (
    <div
      className={`${isHit ? "cell-hit" : "cell-open"} cell-pop relative flex items-center justify-center select-none`}
      style={{ width: size, height: size, animationDelay: `${delay}ms` }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        if (e.button === 0) onDown();
      }}
      onMouseUp={onUp}
      onClick={(e) => {
        if (e.button === 0 && interactive) onReveal(); // chord attempt — the server decides
      }}
      role="gridcell"
    >
      {isHit ? (
        <IconMine size={icon} color={theme.ink} />
      ) : count > 0 ? (
        <span className="font-display leading-none" style={{ color: theme.numbers[count], fontSize }}>
          {count}
        </span>
      ) : null}
    </div>
  );
});

interface BoardProps {
  rows: number;
  cols: number;
  size: number;
  cells: CellView[];
  interactive: boolean;
  won: boolean;
  theme: BoardTheme;
  onReveal: (i: number) => void;
  onFlag: (i: number) => void;
  onDown: () => void;
  onUp: () => void;
}

export default function Board({
  rows,
  cols,
  size,
  cells,
  interactive,
  won,
  theme,
  onReveal,
  onFlag,
  onDown,
  onUp,
}: BoardProps) {
  return (
    <div className={`bevel-well inline-block p-1.5 ${won ? "win-glow" : ""}`}>
      <div
        role="grid"
        onContextMenu={(e) => e.preventDefault()}
        onMouseLeave={onUp}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${size}px)`,
          gridTemplateRows: `repeat(${rows}, ${size}px)`,
        }}
      >
        {cells.map((v, i) => (
          <Cell
            key={i}
            v={v}
            size={size}
            interactive={interactive}
            theme={theme}
            onReveal={() => onReveal(i)}
            onFlag={() => onFlag(i)}
            onDown={onDown}
            onUp={onUp}
          />
        ))}
      </div>
    </div>
  );
}

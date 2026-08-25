/* Pure board math — used by the (mock) server to generate layouts and resolve clicks. */

export function neighborsOf(i: number, rows: number, cols: number): number[] {
  const r = Math.floor(i / cols);
  const c = i % cols;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
    }
  }
  return out;
}

/** Generate a bomb layout on demand. The first-clicked cell and its 8 neighbors are always safe. */
export function placeBombs(rows: number, cols: number, mines: number, safeIdx: number): Set<number> {
  const banned = new Set<number>([safeIdx, ...neighborsOf(safeIdx, rows, cols)]);
  const pool: number[] = [];
  const total = rows * cols;
  for (let i = 0; i < total; i++) if (!banned.has(i)) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = pool[i];
    pool[i] = pool[j];
    pool[j] = t;
  }
  return new Set(pool.slice(0, Math.min(mines, pool.length)));
}

export function countAround(bombs: Set<number>, i: number, rows: number, cols: number): number {
  let n = 0;
  for (const nb of neighborsOf(i, rows, cols)) if (bombs.has(nb)) n++;
  return n;
}

export interface RevealCell {
  i: number;
  count: number;
}

/** BFS flood-fill reveal. Returns cells in distance order (used for the cascade animation). */
export function floodReveal(bombs: Set<number>, rows: number, cols: number, start: number): RevealCell[] {
  if (bombs.has(start)) return [];
  const seen = new Set<number>([start]);
  const out: RevealCell[] = [];
  const queue: number[] = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    const count = countAround(bombs, cur, rows, cols);
    out.push({ i: cur, count });
    if (count === 0) {
      for (const nb of neighborsOf(cur, rows, cols)) {
        if (!seen.has(nb) && !bombs.has(nb)) {
          seen.add(nb);
          queue.push(nb);
        }
      }
    }
  }
  return out;
}

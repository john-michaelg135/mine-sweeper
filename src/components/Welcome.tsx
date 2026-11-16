import { ArrowUpRight, ArrowRight, Flag, MousePointer2, Sparkles, Bomb } from "lucide-react";
import "./Welcome.css";

const preview = [
  "", "", "", "", "", "", "", "",
  "", "", "", "F", "", "", "", "",
  "", "", "1", "1", "2", "", "", "",
  "", "1", "1", "0", "1", "F", "", "",
  "", "1", "0", "0", "1", "2", "", "",
  "", "2", "1", "0", "0", "1", "", "",
  "", "F", "1", "1", "1", "2", "", "",
  "", "", "", "", "", "", "", "",
];

export default function Welcome({ onPlay }: { onPlay: () => void }) {
  return (
    <div className="welcome">
      <header className="welcome-nav">
        <a className="welcome-brand" href="#"><span className="welcome-mark"><Bomb size={21} /></span> MINESWEEPER<span className="welcome-brand-tag">ARENA</span></a>
        <nav aria-label="Welcome navigation"><a href="#how-to-play">How to play</a><button onClick={onPlay}>Enter arena <ArrowUpRight size={16} /></button></nav>
      </header>

      <main>
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-copy">
            <div className="welcome-eyebrow"><span /> A CLASSIC. A FRESH CHALLENGE.</div>
            <h1 id="welcome-title">Small squares.<br />Big <span>brain energy.</span></h1>
            <p>The grid is yours. Read the numbers, trust your logic, and make every click count. Your next personal best starts here.</p>
            <div className="welcome-actions"><button className="welcome-play" onClick={onPlay}>Play now <ArrowRight size={20} /></button><a href="#how-to-play">Learn the basics <span aria-hidden="true">↘</span></a></div>
            <div className="welcome-reassurance"><Sparkles size={15} /> First click is always safe. Take your shot.</div>
          </div>

          <div className="welcome-art" role="img" aria-label="Illustrated Minesweeper board with revealed numbers and flagged squares">
            <div className="welcome-orbit" />
            <div className="welcome-board">
              <div className="welcome-board-top"><span><span className="welcome-live" /> THE NEXT MOVE IS YOURS</span><span>001</span></div>
              <div className="welcome-grid">{preview.map((cell, i) => <span key={i} className={`welcome-cell ${cell ? "is-open" : ""} ${cell === "F" ? "is-flag" : ""} number-${cell}`}>
                {cell === "F" ? <Flag size={24} fill="currentColor" /> : cell === "0" ? "" : cell}
              </span>)}</div>
              <div className="welcome-board-bottom"><span>LESS GUESSWORK.</span><span>MORE “ONE MORE GAME.”</span></div>
            </div>
            <div className="welcome-float"><span><Flag size={20} /></span><div>Find your flow.<small>One square at a time.</small></div></div>
            <div className="welcome-art-note">THE ORIGINAL BRAIN WORKOUT, REIMAGINED.</div>
          </div>
        </section>

        <section className="welcome-guide" id="how-to-play" aria-labelledby="guide-title">
          <div className="welcome-guide-heading"><span className="welcome-eyebrow">SIMPLE RULES. ENDLESS REPLAYS.</span><h2 id="guide-title">Get into the grid.</h2><p>Clear every safe square. Leave the mines behind.</p></div>
          <div className="welcome-steps">
            <article><span className="welcome-step-icon"><MousePointer2 size={22} /></span><span className="welcome-step-number">01 / REVEAL</span><h3>Start with a click.</h3><p>Click or tap a square to open it. Your first move is always safe.</p></article>
            <article><span className="welcome-step-icon welcome-number-icon">1 2 3</span><span className="welcome-step-number">02 / READ</span><h3>Follow the clues.</h3><p>Each number tells you how many mines touch that square, including diagonals.</p></article>
            <article><span className="welcome-step-icon"><Flag size={22} /></span><span className="welcome-step-number">03 / FLAG</span><h3>Mark your suspects.</h3><p>Right-click to flag a mine, or turn on Flag mode when playing on touch.</p></article>
          </div>
        </section>
      </main>
      <footer className="welcome-footer"><span>A little nostalgia. A lot of focus.</span><span>3 difficulty levels <span aria-hidden="true">·</span> Your pace. Your best.</span></footer>
    </div>
  );
}

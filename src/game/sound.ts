/* Tiny WebAudio bleeps — the cabinet's voice. */

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
}

function ac(): AudioContext | null {
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur = 0.08, type: OscillatorType = "square", gain = 0.04, delay = 0, slideTo?: number) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

export const sReveal = () => tone(340, 0.05, "square", 0.022);
export const sOpen = () => tone(520, 0.07, "triangle", 0.045);
export const sFlag = () => {
  tone(760, 0.05, "square", 0.035);
  tone(1140, 0.06, "square", 0.03, 0.05);
};
export const sUnflag = () => tone(300, 0.07, "square", 0.03);
export const sChord = () => tone(230, 0.05, "square", 0.03);

export function sBoom() {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(190, t);
  o.frequency.exponentialRampToValueAtTime(28, t + 0.6);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.75);
  tone(95, 0.4, "sine", 0.1, 0, 38);
}

export function sWin() {
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.15, "square", 0.045, i * 0.09));
}

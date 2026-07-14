// Web Audio API sound generator for game actions
// To comply with autoplay policies, we instantiate the AudioContext lazily on user interaction

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Play a short, clean clicking sound
export function playClickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
}

// Play a quick success chord when getting ready or starting
export function playReadySound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + index * 0.08);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + index * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.25);

    osc.start(now + index * 0.08);
    osc.stop(now + index * 0.08 + 0.3);
  });
}

// Play a distinct high beep when a number is marked
export function playMarkSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
  osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.06); // E6

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

// Play a festive rising arpeggio when a Bingo line is completed
export function playLineCompleteSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const scale = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4 -> C6 pentatonic/major accents

  scale.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + index * 0.06);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + index * 0.06 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.3);

    osc.start(now + index * 0.06);
    osc.stop(now + index * 0.06 + 0.35);
  });
}

// Play a glorious winning melody/fanfare
export function playWinnerSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Fanfare note sequence: C4, G4, C5, E5, G5, C6 (long)
  const notes = [
    { freq: 261.63, duration: 0.15 },
    { freq: 392.00, duration: 0.15 },
    { freq: 523.25, duration: 0.15 },
    { freq: 659.25, duration: 0.15 },
    { freq: 783.99, duration: 0.15 },
    { freq: 1046.50, duration: 0.7 }
  ];

  let accumTime = 0;
  notes.forEach((note) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(note.freq, now + accumTime);

    // Add gentle vibrato for the winning note
    if (note.duration > 0.5) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 8; // 8Hz vibrato
      lfoGain.gain.value = 15; // 15Hz depth
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now + accumTime);
      lfo.stop(now + accumTime + note.duration);
    }

    gain.gain.setValueAtTime(0, now + accumTime);
    gain.gain.linearRampToValueAtTime(0.15, now + accumTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + accumTime + note.duration - 0.02);

    osc.start(now + accumTime);
    osc.stop(now + accumTime + note.duration);

    accumTime += note.duration + 0.02;
  });
}

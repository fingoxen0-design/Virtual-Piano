// Note model, Virtual Piano key bindings, notation parser, and audio engine.
export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export interface PianoKey {
  midi: number;
  name: string; // e.g. C#4
  black: boolean;
}

export const midiToName = (m: number) => `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

// A0 (21) .. C8 (108)
export const KEYS: PianoKey[] = Array.from({ length: 88 }, (_, i) => {
  const midi = 21 + i;
  const n = NOTE_NAMES[midi % 12]!;
  return { midi, name: midiToName(midi), black: n.includes("#") };
});

// Virtual Piano layout: C2 (36) .. C7 (96)
const WHITE_CHARS = "1234567890qwertyuiopasdfghjklzxcvbnm";
const BLACK_CHARS = "!@$%^*(QWETYIOPSDGHJLZCVB";

export const CHAR_TO_MIDI: Record<string, number> = {};
export const MIDI_TO_CHAR: Record<number, string> = {};
{
  let w = 0;
  let b = 0;
  for (let m = 36; m <= 96; m++) {
    const black = NOTE_NAMES[m % 12]!.includes("#");
    const ch = black ? BLACK_CHARS[b++] : WHITE_CHARS[w++];
    if (ch) {
      CHAR_TO_MIDI[ch] = m;
      MIDI_TO_CHAR[m] = ch;
    }
  }
}

// Map physical key codes so Shift releases resolve to the same note.
export function charFromEvent(e: KeyboardEvent): string | null {
  const k = e.key;
  if (k.length === 1 && CHAR_TO_MIDI[k] !== undefined) return k;
  return null;
}

export type Step = { notes: number[]; rest: number };

// Parse Virtual Piano notation: "[eu] o | p" -> steps. Spaces/| add rests.
export function parseNotation(src: string): Step[] {
  const steps: Step[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === "[") {
      const end = src.indexOf("]", i);
      const inner = src.slice(i + 1, end === -1 ? undefined : end);
      const notes = [...inner].map((ch) => CHAR_TO_MIDI[ch]).filter((n) => n !== undefined);
      if (notes.length) steps.push({ notes, rest: 0 });
      i = end === -1 ? src.length : end + 1;
      continue;
    }
    if (c === " " || c === "\n") {
      if (steps.length) steps[steps.length - 1]!.rest += 1;
    } else if (c === "|") {
      if (steps.length) steps[steps.length - 1]!.rest += 2;
    } else if (CHAR_TO_MIDI[c] !== undefined) {
      steps.push({ notes: [CHAR_TO_MIDI[c]], rest: 0 });
    }
    i++;
  }
  return steps;
}

export function notesToNotation(notes: number[]): string {
  const chars = notes.map((n) => MIDI_TO_CHAR[n]).filter(Boolean);
  if (!chars.length) return "";
  return chars.length === 1 ? chars[0]! : `[${chars.join("")}]`;
}

/* ---------------- Audio engine (client only) ---------------- */
type ToneNS = typeof import("tone");
let Tone: ToneNS | null = null;
let sampler: import("tone").Sampler | null = null;
let physicalFallback: import("tone").PolySynth | null = null;
let volumeNode: import("tone").Volume | null = null;
let reverbNode: import("tone").Freeverb | null = null;
let analyserNode: import("tone").Analyser | null = null;
let tick: import("tone").MembraneSynth | null = null;
let samplesReady = false;
let isInitializing = false;
const readyCallbacks: (() => void)[] = [];
let streamDest: MediaStreamAudioDestinationNode | null = null;

export async function initAudio(onReady?: () => void) {
  if (onReady) {
    if (samplesReady) {
      onReady();
    } else {
      readyCallbacks.push(onReady);
    }
  }

  if (Tone) {
    await Tone.start();
    return;
  }
  if (isInitializing) return;
  isInitializing = true;

  Tone = await import("tone");
  await Tone.start();
  volumeNode = new Tone.Volume(-6).toDestination();

  // Akustik bo'shliq: standart 0% qo'shimcha exo (100% sof akustik studiya royali)
  try {
    reverbNode = new Tone.Freeverb({
      roomSize: 0.35,
      dampening: 4500,
    }).connect(volumeNode);
    reverbNode.wet.value = 0.0;
  } catch {
    reverbNode = null;
  }

  // Waveform analyser for real-time visualizer
  try {
    analyserNode = new Tone.Analyser("waveform", 32);
    volumeNode.connect(analyserNode);
  } catch {
    analyserNode = null;
  }

  const audioOutput = reverbNode || volumeNode;

  // Instant fallback while 30 MP3 samples decode: zero lag, zero silence
  try {
    physicalFallback = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 32,
      oscillator: { type: "triangle8" },
      envelope: { attack: 0.003, decay: 2.2, sustain: 0.08, release: 0.25 },
    }).connect(audioOutput);
  } catch {
    physicalFallback = null;
  }

  tick = new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 2 }).connect(volumeNode);

  const urls: Record<string, string> = {
    A0: "A0.mp3",
    C8: "C8.mp3",
  };
  for (let o = 1; o <= 7; o++) {
    urls[`C${o}`] = `C${o}.mp3`;
    urls[`D#${o}`] = `Ds${o}.mp3`;
    urls[`F#${o}`] = `Fs${o}.mp3`;
    urls[`A${o}`] = `A${o}.mp3`;
  }

  // 100% Haqiqiy Yamaha C5 Grand Concert akustik audio yozuvlari
  // release: 0.24s — haqiqiy kigiz dempferning jismoniy simga tushish va to'xtatish vaqti
  sampler = new Tone.Sampler({
    urls,
    release: 0.24,
    baseUrl: "/audio/piano/",
    onload: () => {
      samplesReady = true;
      isInitializing = false;
      while (readyCallbacks.length > 0) {
        readyCallbacks.shift()?.();
      }
    },
    onerror: () => {
      samplesReady = false;
      isInitializing = false;
    },
  }).connect(audioOutput);
}

export type AcousticSpace = "dry" | "room" | "hall";

export function setAcousticSpace(space: AcousticSpace | number) {
  if (!reverbNode) return;
  if (typeof space === "number") {
    reverbNode.wet.value = Math.max(0, Math.min(0.5, space));
    return;
  }
  if (space === "dry") {
    reverbNode.wet.value = 0.0; // Sof studiya (0% sun'iy aks-sado/exo)
  } else if (space === "room") {
    reverbNode.roomSize.value = 0.35;
    reverbNode.dampening = 4500;
    reverbNode.wet.value = 0.06;
  } else if (space === "hall") {
    reverbNode.roomSize.value = 0.6;
    reverbNode.dampening = 3800;
    reverbNode.wet.value = 0.16;
  }
}

export function getAcousticWet(): number {
  return reverbNode ? reverbNode.wet.value : 0;
}

export function isSamplesLoaded() {
  return samplesReady;
}

export function getAudioWaveform(): Float32Array | null {
  if (!analyserNode) return null;
  try {
    return analyserNode.getValue() as Float32Array;
  } catch {
    return null;
  }
}

export function noteOn(midi: number, velocity = 0.8) {
  if (!Tone) return;
  const noteName = Tone.Frequency(midi, "midi").toNote();
  const safeVel = typeof velocity === "number" && !isNaN(velocity) ? velocity : 0.8;
  try {
    if (sampler && sampler.loaded) {
      sampler.triggerAttack(noteName, Tone.now(), safeVel);
    } else if (physicalFallback) {
      physicalFallback.triggerAttack(noteName, Tone.now(), safeVel);
    }
  } catch {
    try {
      physicalFallback?.triggerAttack(noteName, Tone.now(), safeVel);
    } catch {
      // ignore
    }
  }
}

export function noteOff(midi: number) {
  if (!Tone) return;
  const noteName = Tone.Frequency(midi, "midi").toNote();
  try {
    if (sampler && sampler.loaded) {
      sampler.triggerRelease(noteName, Tone.now());
    } else if (physicalFallback) {
      physicalFallback.triggerRelease(noteName, Tone.now());
    }
  } catch {
    // ignore
  }
}

export function stopAllAudio() {
  if (!Tone) return;
  try {
    if (sampler && typeof sampler.releaseAll === "function") {
      sampler.releaseAll();
    }
    if (physicalFallback && typeof physicalFallback.releaseAll === "function") {
      physicalFallback.releaseAll();
    }
  } catch {
    // ignore
  }
}
export function setVolume(v: number) {
  if (!volumeNode) return;
  const safeVol =
    typeof v === "number" && !isNaN(v) && isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.8;
  volumeNode.volume.value = safeVol <= 0.001 ? -Infinity : 20 * Math.log10(safeVol);
}
export function playTick(accent: boolean) {
  if (!Tone || !tick) return;
  tick.triggerAttackRelease(accent ? "C5" : "G4", "32n", Tone.now(), accent ? 0.9 : 0.5);
}
export function getAudioStream(): MediaStream | null {
  if (!Tone || !volumeNode) return null;
  if (!streamDest) {
    const raw = Tone.getContext().rawContext as AudioContext;
    streamDest = raw.createMediaStreamDestination();
    volumeNode.connect(streamDest as unknown as import("tone").InputNode);
  }
  return streamDest.stream;
}

/* ---------------- MIDI file export ---------------- */
export type RecEvent = { midi: number; t: number; d: number; v: number };

export function exportMidi(events: RecEvent[], bpm = 120): Blob {
  const ppq = 480;
  const msPerTick = 60000 / bpm / ppq;
  const msgs: { tick: number; bytes: number[] }[] = [];
  for (const e of events) {
    const vel = Math.max(1, Math.min(127, Math.round(e.v * 127)));
    msgs.push({ tick: Math.round(e.t / msPerTick), bytes: [0x90, e.midi, vel] });
    msgs.push({ tick: Math.round((e.t + e.d) / msPerTick), bytes: [0x80, e.midi, 0] });
  }
  msgs.sort((a, b) => a.tick - b.tick);
  const vlq = (n: number) => {
    const out = [n & 0x7f];
    while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
    return out;
  };
  const tempo = Math.round(60000000 / bpm);
  const track: number[] = [0, 0xff, 0x51, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255];
  let last = 0;
  for (const m of msgs) {
    track.push(...vlq(m.tick - last), ...m.bytes);
    last = m.tick;
  }
  track.push(0, 0xff, 0x2f, 0);
  const len = track.length;
  const bytes = [
    0x4d,
    0x54,
    0x68,
    0x64,
    0,
    0,
    0,
    6,
    0,
    0,
    0,
    1,
    (ppq >> 8) & 255,
    ppq & 255,
    0x4d,
    0x54,
    0x72,
    0x6b,
    (len >> 24) & 255,
    (len >> 16) & 255,
    (len >> 8) & 255,
    len & 255,
    ...track,
  ];
  return new Blob([new Uint8Array(bytes)], { type: "audio/midi" });
}

export function eventsToNotation(events: RecEvent[]): string {
  const sorted = [...events].sort((a, b) => a.t - b.t);
  const out: string[] = [];
  let i = 0;
  let prevT = -1;
  while (i < sorted.length) {
    const t = sorted[i]!.t;
    const group: number[] = [];
    while (i < sorted.length && sorted[i]!.t - t < 40) group.push(sorted[i++]!.midi);
    if (prevT >= 0 && t - prevT > 600) out.push("|");
    out.push(notesToNotation(group));
    prevT = t;
  }
  return out.filter(Boolean).join(" ");
}

export function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

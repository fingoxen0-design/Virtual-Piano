import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Circle,
  Download,
  Footprints,
  Music2,
  Pause,
  Play,
  Settings2,
  Square,
  Timer,
  Trash2,
  Usb,
  Volume2,
  Keyboard as KeyboardIcon,
  GraduationCap,
  X,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  KEYS,
  MIDI_TO_CHAR,
  charFromEvent,
  CHAR_TO_MIDI,
  download,
  eventsToNotation,
  exportMidi,
  getAudioStream,
  initAudio,
  noteOff,
  noteOn,
  stopAllAudio,
  parseNotation,
  playTick,
  setVolume,
  setAcousticSpace,
  type AcousticSpace,
  midiToName,
  NOTE_NAMES,
  type RecEvent,
  type Step,
} from "@/lib/piano";
import { SONGS, type Song, type Difficulty } from "@/lib/songs";

type LabelMode = "keys" | "notes" | "none";
export type KeyRange = "49" | "61" | "88";
type Recording = { id: string; name: string; date: number; events: RecEvent[] };

const load = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
const save = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
const clamp = (n: number) => Math.max(21, Math.min(108, n));

interface VirtualPianoProps {
  initialSongId?: string;
}

export function VirtualPiano({ initialSongId }: VirtualPianoProps = {}) {
  /* -------- settings -------- */
  const [labelMode, setLabelMode] = useState<LabelMode>("keys");
  const [keyRange, setKeyRange] = useState<KeyRange>("61");
  const [fitScreen, setFitScreen] = useState(true);
  const [zoom, setZoom] = useState(30);
  const [volume, setVol] = useState(0.8);
  const [reverbSpace, setReverbSpace] = useState<AcousticSpace>("dry");
  const [transpose, setTranspose] = useState(0);
  const [octave, setOctave] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = load("vp:settings", null as null | Record<string, number | string | boolean>);
    if (s) {
      setLabelMode((s["labelMode"] as LabelMode) ?? "keys");
      setKeyRange((s["keyRange"] as KeyRange) ?? "61");
      setFitScreen(s["fitScreen"] !== undefined ? Boolean(s["fitScreen"]) : true);
      setZoom(Number(s["zoom"] ?? 30));
      setVol(Number(s["volume"] ?? 0.8));
      const space = (s["reverbSpace"] as AcousticSpace) ?? "dry";
      setReverbSpace(space);
      setAcousticSpace(space);
      setTranspose(Number(s["transpose"] ?? 0));
      setOctave(Number(s["octave"] ?? 0));
    }
    setRecordings(load("vp:recordings", []));
    setCustomSongs(load("vp:sheets", []));
    setHydrated(true);

    // Akustik royal namunalarini (Yamaha C5 samples) fonda yuklashni boshlash
    void initAudio(() => setSamplesLoaded(true));
  }, []);
  useEffect(() => {
    if (hydrated)
      save("vp:settings", {
        labelMode,
        keyRange,
        fitScreen,
        zoom,
        volume,
        reverbSpace,
        transpose,
        octave,
      });
    setVolume(volume);
    setAcousticSpace(reverbSpace);
  }, [hydrated, labelMode, keyRange, fitScreen, zoom, volume, reverbSpace, transpose, octave]);

  /* -------- audio state -------- */
  const [audioOn, setAudioOn] = useState(false);
  const [samplesLoaded, setSamplesLoaded] = useState(false);
  const [active, setActive] = useState<Set<number>>(new Set());
  const [sustainedVis, setSustainedVis] = useState<Set<number>>(new Set());
  const [sustain, setSustainState] = useState(false);
  const sustainRef = useRef(false);
  const held = useRef(new Map<string, number>()); // input id -> sounding midi
  const sustained = useRef(new Set<number>());
  const counts = useRef(new Map<number, number>());

  const ensureAudio = useCallback(async () => {
    await initAudio(() => setSamplesLoaded(true));
    setVolume(volume);
    setAudioOn(true);
  }, [volume]);

  const settingsRef = useRef({ transpose, octave });
  settingsRef.current = { transpose, octave };

  /* -------- recording -------- */
  const [recState, setRecState] = useState<"idle" | "rec" | "paused">("idle");
  const rec = useRef({
    start: 0,
    pausedAt: 0,
    offset: 0,
    open: new Map<number, { t: number; v: number }>(),
    events: [] as RecEvent[],
  });
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const mediaRec = useRef<MediaRecorder | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recNow = () => performance.now() - rec.current.start - rec.current.offset;

  /* -------- practice -------- */
  const [song, setSong] = useState<Song | null>(null);
  const steps = useMemo<Step[]>(() => (song ? parseNotation(song.sheet) : []), [song]);
  const [stepIdx, setStepIdx] = useState(-1);
  const [mode, setMode] = useState<"idle" | "auto" | "practice">("idle");
  const practiceHit = useRef(new Set<number>());
  const practiceRef = useRef({ mode, stepIdx, steps });
  practiceRef.current = { mode, stepIdx, steps };

  const sound = useCallback((midi: number, v: number) => {
    counts.current.set(midi, (counts.current.get(midi) ?? 0) + 1);
    if (sustained.current.has(midi)) {
      sustained.current.delete(midi);
      noteOff(midi);
    }
    noteOn(midi, v);
    setActive((s) => new Set(s).add(midi));
    if (rec.current && recStateRef.current === "rec")
      rec.current.open.set(midi, { t: recNow(), v });
  }, []);

  const unsound = useCallback((midi: number) => {
    const c = (counts.current.get(midi) ?? 1) - 1;
    counts.current.set(midi, c);
    if (c > 0) return;
    setActive((s) => {
      const n = new Set(s);
      n.delete(midi);
      return n;
    });
    const o = rec.current.open.get(midi);
    if (o) {
      rec.current.events.push({ midi, t: o.t, d: Math.max(30, recNow() - o.t), v: o.v });
      rec.current.open.delete(midi);
    }
    if (sustainRef.current) {
      sustained.current.add(midi);
      setSustainedVis(new Set(sustained.current));
    } else noteOff(midi);
  }, []);

  const recStateRef = useRef(recState);
  recStateRef.current = recState;

  const checkPractice = (inputMidi: number, rawMidi?: number) => {
    const { mode, stepIdx, steps } = practiceRef.current;
    if (mode !== "practice" || stepIdx < 0) return;
    const need = steps[stepIdx]?.notes ?? [];
    if (!need.includes(inputMidi) && (rawMidi === undefined || !need.includes(rawMidi))) return;
    const hit = need.includes(inputMidi) ? inputMidi : (rawMidi ?? inputMidi);
    practiceHit.current.add(hit);
    if (need.every((n) => practiceHit.current.has(n))) {
      practiceHit.current.clear();
      const next = stepIdx + 1;
      if (next >= steps.length) {
        setMode("idle");
        setStepIdx(-1);
      } else setStepIdx(next);
    }
  };

  const press = useCallback(
    (id: string, midi: number, v = 0.8, applyOctave = false) => {
      if (held.current.has(id)) return;
      void ensureAudio();
      const { transpose, octave } = settingsRef.current;
      const input = midi + (applyOctave ? octave * 12 : 0);
      const s = clamp(input + transpose);
      held.current.set(id, s);
      sound(s, v);
      checkPractice(input, midi);
    },
    [ensureAudio, sound],
  );
  const release = useCallback(
    (id: string) => {
      const s = held.current.get(id);
      if (s === undefined) return;
      held.current.delete(id);
      unsound(s);
    },
    [unsound],
  );

  const setSustain = useCallback((on: boolean) => {
    sustainRef.current = on;
    setSustainState(on);
    if (!on) {
      sustained.current.forEach((m) => {
        if (!(counts.current.get(m) ?? 0)) noteOff(m);
      });
      sustained.current.clear();
      setSustainedVis(new Set());
    }
  }, []);

  /* -------- computer keyboard -------- */
  useEffect(() => {
    const isField = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (isField(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) setSustain(!sustainRef.current);
        return;
      }
      if (e.repeat) return;
      const ch = charFromEvent(e);
      if (!ch) return;
      e.preventDefault();
      press(`k:${e.code}`, CHAR_TO_MIDI[ch]!, 0.8, true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") return;
      release(`k:${e.code}`);
    };
    const blur = () => [...held.current.keys()].filter((k) => k.startsWith("k:")).forEach(release);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [press, release, setSustain]);

  /* -------- pointer / touch glissando -------- */
  const pointerKey = useRef(new Map<number, number>());
  useEffect(() => {
    const up = (e: PointerEvent) => {
      pointerKey.current.delete(e.pointerId);
      release(`p:${e.pointerId}`);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [release]);

  const onKeyPointerDown = (e: React.PointerEvent<HTMLElement>, midi: number) => {
    e.preventDefault();
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    pointerKey.current.set(e.pointerId, midi);
    press(`p:${e.pointerId}`, midi, 0.75);
  };
  const onKeyPointerEnter = (e: React.PointerEvent<HTMLElement>, midi: number) => {
    if (!pointerKey.current.has(e.pointerId) || pointerKey.current.get(e.pointerId) === midi)
      return;
    release(`p:${e.pointerId}`);
    pointerKey.current.set(e.pointerId, midi);
    press(`p:${e.pointerId}`, midi, 0.7);
  };

  /* -------- Web MIDI -------- */
  const [midiStatus, setMidiStatus] = useState<"unsupported" | "none" | "connected">("none");
  const [midiName, setMidiName] = useState("");
  const midiHandlers = useRef({ press, release, setSustain });
  midiHandlers.current = { press, release, setSustain };
  useEffect(() => {
    if (!("requestMIDIAccess" in navigator)) {
      setMidiStatus("unsupported");
      return;
    }
    let access: MIDIAccess | null = null;
    const bind = () => {
      if (!access) return;
      const inputs = [...access.inputs.values()];
      setMidiStatus(inputs.length ? "connected" : "none");
      setMidiName(inputs[0]?.name ?? "");
      inputs.forEach((inp) => {
        inp.onmidimessage = (m) => {
          const d = m.data;
          if (!d) return;
          const st = d[0] ?? 0,
            n = d[1] ?? 0,
            v = d[2] ?? 0;
          const cmd = st & 0xf0;
          const h = midiHandlers.current;
          if (cmd === 0x90 && v > 0) h.press(`m:${n}`, n, v / 127);
          else if (cmd === 0x80 || (cmd === 0x90 && v === 0)) h.release(`m:${n}`);
          else if (cmd === 0xb0 && n === 64) h.setSustain(v >= 64);
        };
      });
    };
    navigator
      .requestMIDIAccess()
      .then((a) => {
        access = a;
        bind();
        a.onstatechange = bind;
      })
      .catch(() => setMidiStatus("unsupported"));
  }, []);

  /* -------- auto-play / playback scheduler -------- */
  const timers = useRef<number[]>([]);
  const [playingRec, setPlayingRec] = useState<string | null>(null);

  const stopTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    [...held.current.keys()].forEach(release);
    held.current.clear();
    sustained.current.clear();
    counts.current.clear();
    setActive(new Set());
    setSustainedVis(new Set());
  }, [release]);

  const stopAll = useCallback(() => {
    stopTimers();
    stopAllAudio();
    setMode("idle");
    setStepIdx(-1);
    setPlayingRec(null);
  }, [stopTimers]);

  // Sahifadan chiqib ketilganda (masalan, Bosh sahifaga qaytilganda) barcha ovozlar va timerni darhol o'chirish
  useEffect(() => {
    return () => {
      stopAll();
      stopAllAudio();
    };
  }, [stopAll]);

  // Brauzer vkladkasi almashtirilganda yoki yashirilganda auto-playni to'xtatish
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && mode === "auto") {
        stopAll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mode, stopAll]);

  const autoPlay = async () => {
    if (!song) return;
    stopTimers();
    await ensureAudio();
    setMode("auto");
    const playBpm = bpm || song.bpm || 70;
    const unit = 60000 / playBpm / 2;
    let t = 0;
    steps.forEach((st, i) => {
      const dur = unit * (1 + st.rest);
      // Haqiqiy royal dempfer mexanikasi: notalar o'z vaqtida tabiiy so'nadi, bir-biriga qo'shilib sun'iy shovqin/exo hosil qilmaydi
      const isBass = st.notes.some((n) => n < 50);
      const isChord = st.notes.length > 1;
      const noteLife = isBass
        ? Math.min(dur * 1.35, unit * 2.0)
        : isChord
          ? Math.min(dur * 1.05, unit * 1.5)
          : Math.max(60, dur * 0.88);

      timers.current.push(
        window.setTimeout(() => {
          setStepIdx(i);
          st.notes.forEach((n) => press(`a:${i}:${n}`, n, 0.75));
        }, t),
        window.setTimeout(() => st.notes.forEach((n) => release(`a:${i}:${n}`)), t + noteLife),
      );
      t += dur;
    });
    timers.current.push(window.setTimeout(() => stopAll(), t + 600));
  };

  const startPractice = async () => {
    stopTimers();
    await ensureAudio();
    practiceHit.current.clear();
    setMode("practice");
    setStepIdx(0);
  };

  const playRecording = async (r: Recording) => {
    stopTimers();
    await ensureAudio();
    setPlayingRec(r.id);
    let end = 0;
    r.events.forEach((ev, i) => {
      timers.current.push(
        window.setTimeout(() => press(`a:r${i}`, ev.midi, ev.v), ev.t),
        window.setTimeout(() => release(`a:r${i}`), ev.t + ev.d),
      );
      end = Math.max(end, ev.t + ev.d);
    });
    timers.current.push(window.setTimeout(() => setPlayingRec(null), end + 200));
  };

  /* -------- recorder controls -------- */
  const startRec = async () => {
    await ensureAudio();
    if (recState === "paused") {
      rec.current.offset += performance.now() - rec.current.pausedAt;
      mediaRec.current?.resume();
      setRecState("rec");
      return;
    }
    rec.current = { start: performance.now(), pausedAt: 0, offset: 0, open: new Map(), events: [] };
    setAudioUrl(null);
    const stream = getAudioStream();
    if (stream && typeof MediaRecorder !== "undefined") {
      const chunks: Blob[] = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () =>
        setAudioUrl(URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || "audio/webm" })));
      mr.start();
      mediaRec.current = mr;
    }
    setRecState("rec");
  };
  const pauseRec = () => {
    rec.current.pausedAt = performance.now();
    mediaRec.current?.pause();
    setRecState("paused");
  };
  const stopRec = () => {
    const now = recNow();
    rec.current.open.forEach((o, midi) =>
      rec.current.events.push({ midi, t: o.t, d: now - o.t, v: o.v }),
    );
    rec.current.open.clear();
    mediaRec.current?.stop();
    mediaRec.current = null;
    setRecState("idle");
    if (!rec.current.events.length) return;
    const r: Recording = {
      id: String(Date.now()),
      name: `Take ${recordings.length + 1}`,
      date: Date.now(),
      events: [...rec.current.events].sort((a, b) => a.t - b.t),
    };
    const next = [r, ...recordings];
    setRecordings(next);
    save("vp:recordings", next);
    setStudioOpen(true);
  };

  /* -------- metronome -------- */
  const [metroOn, setMetroOn] = useState(false);
  const [bpm, setBpm] = useState(100);
  const [beats, setBeats] = useState(4);
  const [beat, setBeat] = useState(-1);
  useEffect(() => {
    if (!metroOn) {
      setBeat(-1);
      return;
    }
    let b = 0;
    const tickFn = () => {
      playTick(b % beats === 0);
      setBeat(b % beats);
      b++;
    };
    tickFn();
    const id = window.setInterval(tickFn, 60000 / bpm);
    return () => clearInterval(id);
  }, [metroOn, bpm, beats]);

  /* -------- library -------- */
  const [libOpen, setLibOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customSongs, setCustomSongs] = useState<Song[]>([]);
  const activeTokenRef = useRef<HTMLButtonElement | HTMLSpanElement | null>(null);
  const ribbonContainerRef = useRef<HTMLDivElement>(null);

  // Avtomatik markazlashtirish: qaysi qism/notaga kelingan bo'lsa, o'sha nota doim ekran markazida ko'rinadi (skrollash shart emas)
  useEffect(() => {
    if (activeTokenRef.current) {
      activeTokenRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [stepIdx]);

  useEffect(() => {
    const sId =
      initialSongId ||
      (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("song")
        : null);
    if (sId) {
      const all = [...customSongs, ...SONGS];
      const found = all.find((s) => s.id === sId);
      if (found) {
        setSong(found);
        setMode("practice");
        setStepIdx(0);
      }
    }
  }, [initialSongId, customSongs]);

  const [diff, setDiff] = useState<Difficulty | "All">("All");
  const [genre, setGenre] = useState<string>("All");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBpm, setDraftBpm] = useState(54);
  const [draftSheet, setDraftSheet] = useState("");

  const pickSong = (s: Song) => {
    stopAll();
    setTranspose(0);
    setOctave(0);
    setSong(s);
    setBpm(s.bpm);
    setMode("practice");
    setStepIdx(0);
    setLibOpen(false);
  };
  const saveDraft = () => {
    if (!draftSheet.trim()) return;
    const s: Song = {
      id: `c${Date.now()}`,
      title: draftTitle.trim() || "Untitled sheet",
      artist: "You",
      difficulty: "Medium",
      genre: "Custom",
      bpm: draftBpm || 54,
      sheet: draftSheet,
    };
    const next = [s, ...customSongs];
    setCustomSongs(next);
    save("vp:sheets", next);
    setDraftTitle("");
    setDraftSheet("");
    pickSong(s);
  };

  /* -------- keyboard range & geometry -------- */
  const [containerWidth, setContainerWidth] = useState<number>(1200);

  const filteredKeys = useMemo(() => {
    if (keyRange === "49") return KEYS.filter((k) => k.midi >= 48 && k.midi <= 96);
    if (keyRange === "61") return KEYS.filter((k) => k.midi >= 36 && k.midi <= 96);
    return KEYS;
  }, [keyRange]);

  const whites = useMemo(() => filteredKeys.filter((k) => !k.black), [filteredKeys]);
  const blacks = useMemo(() => filteredKeys.filter((k) => k.black), [filteredKeys]);

  const scroller = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ left: 0, max: 0, view: 1, total: 1 });

  const W = useMemo(() => {
    if (!fitScreen) return zoom;
    if (!containerWidth || whites.length === 0) return zoom;
    const avail = Math.max(containerWidth - 24, 320);
    const calcW = Math.floor(avail / whites.length);
    return Math.max(20, calcW);
  }, [fitScreen, zoom, containerWidth, whites.length]);

  const totalKeyWidth = whites.length * W;

  const syncScroll = useCallback(() => {
    const el = scroller.current;
    if (el) {
      setContainerWidth(el.clientWidth);
      setScroll({
        left: el.scrollLeft,
        max: Math.max(0, el.scrollWidth - el.clientWidth),
        view: el.clientWidth,
        total: el.scrollWidth,
      });
    }
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    if (!fitScreen) {
      if (keyRange === "88") {
        const c2Index = whites.findIndex((k) => k.midi === 36);
        el.scrollLeft = Math.max(0, c2Index * W - 8);
      } else {
        el.scrollLeft = 0;
      }
    } else {
      el.scrollLeft = 0;
    }
    syncScroll();
    const ro = new ResizeObserver(() => syncScroll());
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, fitScreen, keyRange, whites, syncScroll]);

  const guide = useMemo(
    () => new Set(mode === "practice" && stepIdx >= 0 ? (steps[stepIdx]?.notes ?? []) : []),
    [mode, stepIdx, steps],
  );
  // An octave has 12 semitones, so shifting by octave * 12 preserves white/black key identity.
  // Transpose changes pitch, not physical keyboard characters.
  const reach = (m: number) => m - octave * 12;
  const label = (midi: number, name: string) => {
    if (labelMode === "notes") return name;
    if (labelMode === "keys") return MIDI_TO_CHAR[reach(midi)] ?? "";
    return "";
  };

  /* -------- sheet tokens for display -------- */
  const tokens = useMemo(() => {
    if (!song) return [] as { text: string; step: number | null }[];
    const out: { text: string; step: number | null }[] = [];
    let s = 0;
    const re = /\[[^\]]*\]|\S/g;
    song.sheet.split("\n").forEach((line, li) => {
      if (li) out.push({ text: "\n", step: null });
      let m: RegExpExecArray | null;
      while ((m = re.exec(line))) {
        const t = m[0];
        const isNote = t.startsWith("[")
          ? [...t].some((c) => CHAR_TO_MIDI[c] !== undefined)
          : CHAR_TO_MIDI[t] !== undefined;
        out.push({ text: t, step: isNote ? s++ : null });
      }
    });
    return out;
  }, [song]);

  const library = [...customSongs, ...SONGS].filter(
    (s) => (diff === "All" || s.difficulty === diff) && (genre === "All" || s.genre === genre),
  );

  /* ================= render ================= */
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden flex-col bg-background text-foreground select-none">
      {/* top bar */}
      <header className="h-12 shrink-0 border-b border-border bg-background/95 backdrop-blur-md text-foreground z-30">
        <div className="mx-auto flex h-full max-w-[1500px] flex-wrap items-center gap-2 px-3">
          <div className="mr-auto flex items-center gap-3">
            <Link
              to="/"
              onClick={() => stopAll()}
              className="flex items-center gap-2 transition-opacity hover:opacity-90"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-neutral-800 border border-neutral-700/80 text-neutral-100 shadow-sm">
                <Music2 className="size-4 text-amber-400" />
              </span>
              <div className="flex flex-col">
                <span className="font-serif text-lg font-bold tracking-tight text-foreground leading-none">
                  Grand
                </span>
                <span className="text-[10px] text-muted-foreground">akustik royal</span>
              </div>
            </Link>

            <nav className="ml-3 hidden sm:flex items-center gap-1 border-l border-border pl-3 text-xs">
              <Link
                to="/"
                onClick={() => stopAll()}
                className="rounded px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                Bosh sahifa
              </Link>
              <Link
                to="/songs"
                onClick={() => stopAll()}
                className="rounded px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                Notalar
              </Link>
              <Link
                to="/learn"
                onClick={() => stopAll()}
                className="rounded px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                Qo'llanma
              </Link>
            </nav>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLibOpen(true)}
            className="gap-1.5 h-8 font-medium text-xs"
          >
            <BookOpen className="size-3.5" /> Kutubxona
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextSpace =
                reverbSpace === "dry" ? "room" : reverbSpace === "room" ? "hall" : "dry";
              setReverbSpace(nextSpace);
              setAcousticSpace(nextSpace);
            }}
            title="Akustik muhit (Exo / Reverb darajasi)"
            className="text-xs gap-1.5 h-8"
          >
            <Sparkles className="size-3.5 text-amber-400" />
            <span className="hidden lg:inline text-muted-foreground">Akustika:</span>
            <span className="font-medium text-foreground">
              {reverbSpace === "dry"
                ? "Sof Studiya (0% Exo)"
                : reverbSpace === "room"
                  ? "Xona"
                  : "Zal"}
            </span>
          </Button>

          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
            {recState === "rec" ? (
              <Button size="sm" variant="ghost" onClick={pauseRec} aria-label="Pause recording">
                <Pause />
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={startRec} aria-label="Record">
                <Circle
                  className={cn(
                    "fill-destructive text-destructive",
                    recState === "paused" && "opacity-60",
                  )}
                />
                <span className="hidden md:inline">
                  {recState === "paused" ? "Resume" : "Record"}
                </span>
              </Button>
            )}
            {recState !== "idle" && (
              <Button size="sm" variant="ghost" onClick={stopRec} aria-label="Stop recording">
                <Square />
              </Button>
            )}
            {recState === "rec" && (
              <span className="mr-2 size-2 animate-pulse rounded-full bg-destructive" />
            )}
            {recordings.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStudioOpen(true)}
                aria-label="Recordings"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Yozuvlar ({recordings.length})
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-secondary px-2 py-1">
            <Button
              size="sm"
              variant={metroOn ? "default" : "ghost"}
              onClick={async () => {
                await ensureAudio();
                setMetroOn(!metroOn);
              }}
              aria-label="Metronome"
            >
              <Timer />
            </Button>
            <span
              key={`${beat}`}
              className={cn(
                "size-2.5 rounded-full",
                beat === 0 ? "bg-primary" : beat > 0 ? "bg-foreground" : "bg-muted-foreground/40",
                beat >= 0 && "animate-beat",
              )}
            />
            <input
              type="number"
              min={40}
              max={240}
              value={bpm}
              onChange={(e) => setBpm(Math.max(40, Math.min(240, Number(e.target.value) || 40)))}
              className="w-14 rounded bg-transparent text-center font-mono text-sm outline-none"
              aria-label="BPM"
            />
            <button
              className="font-mono text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setBeats(beats === 4 ? 3 : 4)}
            >
              {beats}/4
            </button>
          </div>

          <span
            title={midiName}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
              midiStatus === "connected" ? "border-guide text-guide" : "text-muted-foreground",
            )}
          >
            <Usb className="size-3.5" />
            {midiStatus === "connected"
              ? "MIDI connected"
              : midiStatus === "unsupported"
                ? "No MIDI support"
                : "No MIDI device"}
          </span>

          {/* Right Header Tools */}
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
            >
              <Settings2 />
            </Button>
          </div>
        </div>
      </header>

      {/* sheet area */}
      <main className="mx-auto w-full max-w-[1500px] flex-1 min-h-0 px-2 sm:px-4 py-1 flex flex-col justify-between overflow-hidden">
        {song ? (
          <section className="flex-1 min-h-0 flex flex-col justify-between rounded-xl border border-border bg-card/75 p-2 sm:p-3 shadow-xs overflow-hidden">
            {/* Top Minimal Header Row */}
            <div className="flex items-center justify-between gap-3 shrink-0 pb-1.5 border-b border-border/40">
              <div className="flex items-baseline gap-2 truncate">
                <h2 className="font-serif text-base sm:text-lg font-bold truncate text-foreground">
                  {song.title}
                </h2>
                <span className="text-xs text-muted-foreground hidden md:inline">
                  {song.artist} · {song.genre} · {song.bpm} BPM
                </span>
              </div>

              {/* Progress & Controls unified */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-secondary text-xs font-mono font-bold text-foreground border border-border/60">
                  <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>
                    {stepIdx >= 0 ? stepIdx + 1 : 0} / {steps.length}
                  </span>
                  <span className="text-muted-foreground hidden sm:inline">
                    ({Math.round((Math.max(0, stepIdx + 1) / (steps.length || 1)) * 100)}
                    %)
                  </span>
                </div>

                {mode === "idle" ? (
                  <>
                    <Button
                      size="sm"
                      onClick={autoPlay}
                      className="h-7 px-3 text-xs gap-1 bg-foreground text-background hover:opacity-90 font-medium"
                    >
                      <Play className="size-3 fill-current" /> Auto-play
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={startPractice}
                      className="h-7 px-3 text-xs gap-1 font-medium"
                    >
                      <GraduationCap className="size-3" /> Practice
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={stopAll}
                    className="h-7 px-3 text-xs gap-1 font-bold text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
                  >
                    <Square className="size-3 fill-current" /> To'xtatish
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    stopAll();
                    setSong(null);
                  }}
                  className="size-7 text-muted-foreground hover:text-foreground"
                  aria-label="Close sheet"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Single Compact Musical HUD Ribbon (No duplicate row, No vertical pillar!) */}
            <div className="relative w-full flex-1 min-h-0 flex items-center justify-center my-auto overflow-hidden">
              <div
                ref={ribbonContainerRef}
                className="relative flex items-center gap-3 overflow-x-auto py-2 px-[42vw] scroll-smooth no-scrollbar z-10 w-full"
              >
                {tokens
                  .filter((t) => t.text !== "\n")
                  .map((t, i) => {
                    const isActive = t.step === stepIdx;
                    const isPast = t.step !== null && t.step < stepIdx;
                    const isFuture = t.step !== null && t.step > stepIdx;
                    const isBar = t.text === "|";

                    if (isBar) {
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center justify-center px-1 text-2xl font-black text-amber-500/80 shrink-0 select-none opacity-80"
                        >
                          |
                        </span>
                      );
                    }

                    // For the active note: detect Shift tag for black keys
                    const activeStepNotes =
                      isActive && stepIdx >= 0 && steps[stepIdx] ? steps[stepIdx].notes : [];
                    const hasBlackKey = activeStepNotes.some((n) =>
                      NOTE_NAMES[n % 12]?.includes("#"),
                    );

                    return (
                      <button
                        type="button"
                        key={i}
                        ref={isActive ? activeTokenRef : null}
                        onClick={() => {
                          if (t.step !== null) {
                            setStepIdx(t.step);
                          }
                        }}
                        className={cn(
                          "relative inline-flex items-center justify-center font-mono font-black transition-all shrink-0 cursor-pointer select-none",
                          // Active Note: Prominent, bold, beautiful contrast in both Light & Dark
                          isActive &&
                            "min-w-[80px] h-14 sm:h-16 px-4 rounded-2xl bg-cyan-400 text-slate-950 text-2xl sm:text-3xl shadow-[0_0_28px_rgba(34,211,238,0.95)] border-2 border-white scale-110 z-20 ring-4 ring-cyan-400/30",
                          // Upcoming Notes: Large, comfortable (text-2xl), bold and crisp in both Light & Dark
                          isFuture &&
                            "min-w-[52px] h-11 sm:h-12 px-3.5 rounded-xl bg-secondary text-foreground text-xl sm:text-2xl hover:bg-secondary/80 hover:scale-105 border border-border shadow-xs",
                          // Past Notes: Dimmed & line-through
                          isPast &&
                            "min-w-[38px] h-9 px-2.5 rounded-lg bg-muted/40 text-muted-foreground/45 text-base sm:text-lg line-through opacity-50 border border-transparent",
                          t.step === null && "text-muted-foreground/60 text-base font-medium px-1",
                        )}
                      >
                        {t.text}
                        {isActive && hasBlackKey && (
                          <span className="absolute -top-2.5 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-sans font-bold text-white shadow-xs">
                            Shift
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          </section>
        ) : (
          <section className="flex-1 min-h-0 flex flex-col items-center justify-center text-center p-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold">
              Konsert royal pianino studiyasiga{" "}
              <span className="text-amber-500">xush kelibsiz</span>
            </h2>
            <p className="mt-1.5 max-w-lg text-xs sm:text-sm text-muted-foreground">
              Klaviatura, sichqoncha yoki USB-MIDI kontroller yordamida chaling. Qora klavishlar
              uchun{" "}
              <kbd className="rounded bg-secondary px-1.5 font-mono text-xs text-foreground border border-border">
                Shift
              </kbd>
              , sustain uchun{" "}
              <kbd className="rounded bg-secondary px-1.5 font-mono text-xs text-foreground border border-border">
                Space
              </kbd>{" "}
              tugmasidan foydalaning.
            </p>
            <Button
              className="mt-3 gap-1.5 h-8 text-xs font-medium"
              onClick={() => setLibOpen(true)}
            >
              <BookOpen className="size-3.5" /> Notalar kutubxonasini ochish
            </Button>
          </section>
        )}
      </main>

      {/* piano */}
      <section className="shrink-0 border-t border-border/60 bg-background/95 px-2 pb-2 pt-1 backdrop-blur z-20">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              {/* Range switcher */}
              <div className="flex items-center gap-1 rounded-xl bg-secondary/80 p-1 border border-border">
                <span className="text-[11px] font-semibold text-foreground/70 px-2">Diapazon:</span>
                {(["49", "61", "88"] as KeyRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setKeyRange(r)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
                      keyRange === r
                        ? "bg-amber-500 text-black shadow-sm font-black"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r === "61"
                      ? "61 klavish (Standart)"
                      : r === "49"
                        ? "49 (Katta)"
                        : "88 (Grand)"}
                  </button>
                ))}
              </div>

              {/* Sustain pedal */}
              <Button
                size="sm"
                variant={sustain ? "default" : "secondary"}
                onClick={() => setSustain(!sustain)}
                className="h-8 gap-1.5 text-xs font-bold"
                title="Space tugmasi orqali ham boshqariladi"
              >
                <Footprints className="size-3.5" /> Sustain: {sustain ? "YOQIQ" : "O'CHIQ"}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Labels mode */}
              <div className="flex items-center gap-1 rounded-xl bg-secondary/80 p-1 border border-border">
                <KeyboardIcon className="size-3.5 ml-1.5 text-muted-foreground" />
                {(["keys", "notes", "none"] as LabelMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setLabelMode(m)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
                      labelMode === m
                        ? "bg-foreground text-background shadow-sm font-black"
                        : "hover:text-foreground text-muted-foreground",
                    )}
                  >
                    {m === "keys" ? "Klaviaturadagi harflar" : m === "notes" ? "Notalar" : "Toza"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* mini-map overview (shown only when free zoom/scroll is enabled) */}
          {!fitScreen && (
            <div
              className="group relative mb-2.5 h-6 cursor-pointer rounded-md overflow-hidden bg-[#18181b] border border-neutral-800 shadow-inner"
              title="Navigatsiya qilish uchun bosing"
              onPointerDown={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const el = scroller.current;
                if (el)
                  el.scrollTo({
                    left: ((e.clientX - r.left) / r.width) * el.scrollWidth - el.clientWidth / 2,
                    behavior: "smooth",
                  });
              }}
            >
              {/* White keys on mini-map */}
              <div className="absolute inset-0 flex">
                {whites.map((k) => (
                  <div
                    key={k.midi}
                    className={cn(
                      "flex-1 border-r border-neutral-800/80 bg-[#27272a]/50 transition-colors",
                      k.name.startsWith("C") && "bg-neutral-700/60 border-r-neutral-600/60",
                      active.has(k.midi) && "bg-amber-400",
                    )}
                  />
                ))}
              </div>
              {/* Black keys on mini-map */}
              <div className="absolute inset-x-0 top-0 h-3.5 pointer-events-none">
                {blacks.map((k) => {
                  const wi = whites.findIndex((w) => w.midi > k.midi);
                  const pct = (wi / whites.length) * 100;
                  return (
                    <div
                      key={k.midi}
                      className={cn(
                        "absolute top-0 w-[1.2%] h-full -translate-x-1/2 bg-black rounded-b-[1px]",
                        active.has(k.midi) && "bg-amber-400",
                      )}
                      style={{ left: `${pct}%` }}
                    />
                  );
                })}
              </div>
              {/* Viewport indicator window */}
              <div
                className="absolute inset-y-0 rounded border-2 border-primary/90 bg-primary/20 backdrop-blur-[1px] shadow-[0_0_8px_rgba(234,179,8,0.3)] transition-all pointer-events-none"
                style={{
                  left: `${(scroll.left / Math.max(1, scroll.total)) * 100}%`,
                  width: `${(scroll.view / Math.max(1, scroll.total)) * 100}%`,
                }}
              />
            </div>
          )}

          {/* Piano Keyboard Frame */}
          <div className="relative rounded-t-xl overflow-hidden border border-neutral-800/90 bg-[#121215] shadow-[0_-8px_25px_rgba(0,0,0,0.6)]">
            {/* Fallboard / Upper Wooden Rail with Gold Logo and Felt */}
            <div className="relative flex flex-col justify-end bg-gradient-to-b from-[#18181b] via-[#232328] to-[#121215] pt-1.5 border-b border-black select-none">
              <div className="flex items-center justify-between px-5 pb-1 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-serif italic font-bold tracking-widest text-amber-500 drop-shadow-sm text-sm">
                    YAMAHA C5 GRAND
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    100% Akustik Royal
                  </span>
                </div>

                {/* Real-time acoustic spectrum meter */}
                <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-black/60 border border-amber-500/20 shadow-inner">
                  <span
                    className={cn(
                      "size-1.5 rounded-full transition-colors",
                      active.size > 0 || mode === "auto"
                        ? "bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.9)]"
                        : "bg-neutral-600",
                    )}
                  />
                  <div className="flex items-end gap-[3px] h-3.5 px-0.5">
                    {Array.from({ length: 16 }).map((_, idx) => {
                      const isAudible = active.size > 0 || mode === "auto";
                      const h = isAudible
                        ? Math.min(100, Math.max(18, ((idx * 23 + active.size * 29) % 82) + 18))
                        : 15;
                      return (
                        <span
                          key={idx}
                          className="w-1 rounded-full bg-gradient-to-t from-amber-600 via-amber-400 to-amber-200 transition-all duration-100"
                          style={{ height: `${h}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Authentic Crimson Felt Strip at the key base */}
              <div className="h-2.5 w-full bg-gradient-to-r from-[#4a080d] via-[#991b1b] to-[#4a080d] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_2px_5px_rgba(0,0,0,0.85)] z-20" />
            </div>

            {/* Keys Scroller */}
            <div
              ref={scroller}
              onScroll={syncScroll}
              className={cn(
                "bg-[#09090b] pt-1 pb-2 px-2 custom-piano-scroll",
                fitScreen ? "overflow-x-hidden flex justify-center" : "overflow-x-auto",
              )}
              style={{ touchAction: fitScreen ? "none" : "pan-x" }}
            >
              <div
                className="relative select-none mx-auto"
                style={{
                  width: totalKeyWidth,
                  height: Math.max(160, Math.min(235, W * 4.6)),
                  touchAction: "none",
                }}
              >
                {whites.map((k, i) => {
                  const on = active.has(k.midi);
                  const isC4 = k.name === "C4";
                  const isAnyC = k.name.startsWith("C");
                  const keyLabel = label(k.midi, k.name);
                  return (
                    <div
                      key={k.midi}
                      onPointerDown={(e) => onKeyPointerDown(e, k.midi)}
                      onPointerEnter={(e) => onKeyPointerEnter(e, k.midi)}
                      className={cn(
                        "key-white absolute top-0 flex flex-col justify-end items-center pb-3",
                        sustainedVis.has(k.midi) && !on && "key-sustained",
                        guide.has(k.midi) && !on && "key-guide",
                        on && "key-active",
                      )}
                      style={{ left: i * W, width: W, height: "100%" }}
                    >
                      {/* Top fallboard shadow overlay */}
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-black/30 to-transparent" />

                      {/* Hammer strike acoustic ripple */}
                      {on && (
                        <span className="pointer-events-none absolute bottom-5 size-8 rounded-full border-2 border-amber-300 bg-amber-400/40 animate-ping z-20" />
                      )}

                      {/* Practice guide cyan floating badge */}
                      {guide.has(k.midi) && (
                        <div className="pointer-events-none absolute top-4 sm:top-5 z-30 flex size-9 sm:size-10 items-center justify-center rounded-xl bg-cyan-400 text-black font-black font-mono text-base sm:text-lg shadow-[0_0_28px_rgba(34,211,238,1)] animate-bounce border-2 border-white ring-4 ring-cyan-400/40">
                          {MIDI_TO_CHAR[k.midi] ?? k.name}
                        </div>
                      )}

                      {/* Middle C special marker */}
                      {isC4 && (
                        <div className="pointer-events-none absolute top-5 size-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,1)]" />
                      )}

                      {/* Labels */}
                      <div className="pointer-events-none flex flex-col items-center gap-1 select-none">
                        {labelMode === "keys" && (
                          <>
                            {keyLabel ? (
                              <span
                                className={cn(
                                  "flex size-7 sm:size-8 items-center justify-center rounded-lg font-mono text-xs sm:text-sm font-black shadow-md border transition-all",
                                  on
                                    ? "bg-amber-400 text-black border-amber-500 scale-110 shadow-[0_0_12px_rgba(245,158,11,0.7)]"
                                    : "bg-neutral-100 text-neutral-900 border-neutral-300",
                                )}
                              >
                                {keyLabel}
                              </span>
                            ) : null}
                            {isAnyC && (
                              <span
                                className={cn(
                                  "font-sans text-[11px] sm:text-xs font-black tracking-tight",
                                  isC4 ? "text-amber-600 font-black" : "text-neutral-400",
                                )}
                              >
                                {k.name}
                              </span>
                            )}
                          </>
                        )}

                        {labelMode === "notes" && (
                          <span
                            className={cn(
                              "font-mono text-xs sm:text-sm font-black tracking-tight",
                              on
                                ? "text-amber-950 font-black"
                                : isC4
                                  ? "text-amber-600 font-black"
                                  : "text-neutral-700",
                            )}
                          >
                            {k.name}
                          </span>
                        )}

                        {labelMode === "none" && isC4 && (
                          <span className="font-sans text-[10px] font-black text-neutral-400">
                            C4
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {blacks.map((k) => {
                  const wi = whites.findIndex((w) => w.midi > k.midi);
                  const on = active.has(k.midi);
                  const bw = Math.max(14, Math.round(W * 0.64));
                  const keyChar =
                    labelMode === "notes" ? k.name.replace(/\d/, "") : label(k.midi, k.name);
                  const leftPos = wi >= 0 ? wi * W - bw / 2 : 0;
                  return (
                    <div
                      key={k.midi}
                      onPointerDown={(e) => onKeyPointerDown(e, k.midi)}
                      onPointerEnter={(e) => onKeyPointerEnter(e, k.midi)}
                      className={cn(
                        "key-black absolute top-0 z-10 flex flex-col justify-end items-center pb-2.5",
                        guide.has(k.midi) && !on && "key-guide",
                        on && "key-active",
                      )}
                      style={{ left: leftPos, width: bw, height: "62%" }}
                    >
                      {/* Top specular reflection strip */}
                      <div className="pointer-events-none absolute inset-x-1 top-0.5 h-1/3 rounded-t-sm bg-gradient-to-b from-white/20 to-transparent" />

                      {/* Hammer strike acoustic ripple */}
                      {on && (
                        <span className="pointer-events-none absolute bottom-4 size-6 rounded-full border-2 border-amber-300 bg-amber-400/50 animate-ping z-20" />
                      )}

                      {/* Practice guide cyan floating badge */}
                      {guide.has(k.midi) && (
                        <div className="pointer-events-none absolute top-2 sm:top-3 z-30 flex size-8 sm:size-9 items-center justify-center rounded-xl bg-cyan-400 text-black font-black font-mono text-sm sm:text-base shadow-[0_0_28px_rgba(34,211,238,1)] animate-bounce border-2 border-white ring-4 ring-cyan-400/40">
                          {MIDI_TO_CHAR[k.midi] ?? k.name}
                        </div>
                      )}

                      {/* Front bevel lip highlight */}
                      <div className="pointer-events-none absolute inset-x-0.5 bottom-0.5 h-1 rounded-b-[2px] bg-gradient-to-t from-white/10 to-transparent" />

                      {/* Black key label */}
                      {keyChar && (
                        <span
                          className={cn(
                            "pointer-events-none select-none font-mono text-xs sm:text-sm font-black tracking-tight px-1 py-0.5 rounded shadow z-10",
                            on
                              ? "bg-amber-400 text-black font-black drop-shadow-[0_0_6px_rgba(252,211,77,0.9)]"
                              : guide.has(k.midi)
                                ? "bg-cyan-400 text-black font-black drop-shadow-[0_0_6px_rgba(45,212,191,0.9)]"
                                : "bg-black/60 text-neutral-200 border border-white/20",
                          )}
                        >
                          {keyChar}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* library */}
      <Dialog open={libOpen} onOpenChange={setLibOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Song library</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="catalog">
            <TabsList>
              <TabsTrigger value="catalog">Catalog</TabsTrigger>
              <TabsTrigger value="create">Create sheet</TabsTrigger>
            </TabsList>
            <TabsContent value="catalog" className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {(["All", "Easy", "Medium", "Hard"] as const).map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={diff === d ? "default" : "secondary"}
                    onClick={() => setDiff(d)}
                  >
                    {d}
                  </Button>
                ))}
                <span className="mx-1 w-px bg-border" />
                {[
                  "All",
                  "Traditional / Folk",
                  "Classical",
                  "Pop",
                  "Anime/Game",
                  "Movie OST",
                  "Custom",
                ].map((g) => (
                  <Button
                    key={g}
                    size="sm"
                    variant={genre === g ? "default" : "ghost"}
                    onClick={() => setGenre(g)}
                  >
                    {g === "Traditional / Folk" ? "O'zbek / Folk" : g}
                  </Button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {library.map((s) => (
                  <div
                    key={s.id}
                    className="group flex items-center gap-3 rounded-xl border bg-secondary/40 p-3 hover:border-primary"
                  >
                    <button className="flex-1 text-left" onClick={() => pickSong(s)}>
                      <div className="font-semibold">{s.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.artist} · {s.genre}
                      </div>
                    </button>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        s.difficulty === "Easy"
                          ? "bg-guide/20 text-guide"
                          : s.difficulty === "Medium"
                            ? "bg-primary/20 text-primary"
                            : "bg-destructive/20 text-destructive",
                      )}
                    >
                      {s.difficulty}
                    </span>
                    {s.genre === "Custom" && (
                      <button
                        aria-label="Delete sheet"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const next = customSongs.filter((c) => c.id !== s.id);
                          setCustomSongs(next);
                          save("vp:sheets", next);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
                {!library.length && (
                  <p className="text-sm text-muted-foreground">No songs match these filters.</p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="create" className="space-y-3">
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="Kuy nomi (masalan: Moonlight Sonata)"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                />
                <div className="flex items-center gap-1.5 rounded-md border border-input bg-card px-2.5">
                  <span className="text-xs text-muted-foreground font-mono">BPM:</span>
                  <input
                    type="number"
                    min={30}
                    max={240}
                    className="w-14 bg-transparent text-center font-mono text-sm outline-none"
                    value={draftBpm}
                    onChange={(e) =>
                      setDraftBpm(Math.max(30, Math.min(240, Number(e.target.value) || 54)))
                    }
                  />
                </div>
              </div>
              <Textarea
                rows={8}
                className="font-mono text-xs sm:text-sm"
                value={draftSheet}
                onChange={(e) => setDraftSheet(e.target.value)}
                placeholder="[60] e t 0 e t 0 e t [50] e t..."
              />
              <p className="text-xs text-muted-foreground">
                Harflar va raqamlar klavishlar, bosh harflar va belgilar qora klavishlar,{" "}
                <code>[abc]</code> akkord chaladi, bo'sh joylar va <code>|</code> pauza beradi.
              </p>
              <div className="flex gap-2">
                <Button onClick={saveDraft} disabled={!draftSheet.trim()}>
                  Saqlash va ochish
                </Button>
                <Button
                  variant="outline"
                  disabled={!draftSheet.trim()}
                  onClick={() => {
                    setLibOpen(false);
                    setSong({
                      id: "preview",
                      title: draftTitle || "Noma'lum kuy",
                      artist: "Siz",
                      difficulty: "Medium",
                      genre: "Custom",
                      bpm: draftBpm || 54,
                      sheet: draftSheet,
                    });
                    setBpm(draftBpm || 54);
                  }}
                >
                  Tinglab ko'rish
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* studio / recordings */}
      <Sheet open={studioOpen} onOpenChange={setStudioOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Your recordings</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 p-4">
            {audioUrl && (
              <div className="rounded-xl border border-primary/50 bg-primary/10 p-3">
                <p className="mb-2 text-sm">Audio of your latest take</p>
                <audio controls src={audioUrl} className="w-full" />
                <a
                  href={audioUrl}
                  download="grand-take.webm"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-primary"
                >
                  <Download className="size-4" /> Download audio
                </a>
              </div>
            )}
            {!recordings.length && (
              <p className="text-sm text-muted-foreground">
                Hit Record, play something, then Stop — your takes show up here.
              </p>
            )}
            {recordings.map((r) => (
              <div key={r.id} className="rounded-xl border bg-secondary/40 p-3">
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 bg-transparent font-semibold outline-none"
                    value={r.name}
                    onChange={(e) => {
                      const next = recordings.map((x) =>
                        x.id === r.id ? { ...x, name: e.target.value } : x,
                      );
                      setRecordings(next);
                      save("vp:recordings", next);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{r.events.length} notes</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {playingRec === r.id ? (
                    <Button size="sm" onClick={stopAll}>
                      <Square /> Stop
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => playRecording(r)}>
                      <Play /> Play
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => download(exportMidi(r.events), `${r.name}.mid`)}
                  >
                    MIDI
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      download(
                        new Blob([eventsToNotation(r.events)], { type: "text/plain" }),
                        `${r.name}.txt`,
                      )
                    }
                  >
                    Sheet
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDraftTitle(r.name);
                      setDraftSheet(eventsToNotation(r.events));
                      setStudioOpen(false);
                      setLibOpen(true);
                    }}
                  >
                    To sheet
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Delete"
                    onClick={() => {
                      const next = recordings.filter((x) => x.id !== r.id);
                      setRecordings(next);
                      save("vp:recordings", next);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* settings */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Settings</SheetTitle>
          </SheetHeader>
          <div className="space-y-7 p-4">
            <Setting
              label={
                <>
                  <Volume2 className="size-4" /> Volume
                </>
              }
              value={`${Math.round(volume * 100)}%`}
            >
              <Slider
                value={[volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={([v]) => setVol(v ?? 0)}
              />
            </Setting>
            <Setting
              label="Akustika & Reverb (Exo darajasi)"
              value={
                reverbSpace === "dry"
                  ? "Sof Studiya (0% Exo)"
                  : reverbSpace === "room"
                    ? "Xona"
                    : "Zal"
              }
            >
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant={reverbSpace === "dry" ? "default" : "secondary"}
                  onClick={() => {
                    setReverbSpace("dry");
                    setAcousticSpace("dry");
                  }}
                >
                  Sof Studiya (0% Exo)
                </Button>
                <Button
                  size="sm"
                  variant={reverbSpace === "room" ? "default" : "secondary"}
                  onClick={() => {
                    setReverbSpace("room");
                    setAcousticSpace("room");
                  }}
                >
                  Xona
                </Button>
                <Button
                  size="sm"
                  variant={reverbSpace === "hall" ? "default" : "secondary"}
                  onClick={() => {
                    setReverbSpace("hall");
                    setAcousticSpace("hall");
                  }}
                >
                  Zal
                </Button>
              </div>
            </Setting>
            <Setting label="Transpose" value={`${transpose > 0 ? "+" : ""}${transpose}`}>
              <Slider
                value={[transpose]}
                min={-12}
                max={12}
                step={1}
                onValueChange={([v]) => setTranspose(v ?? 0)}
              />
            </Setting>
            <Setting label="Keyboard octave shift" value={`${octave > 0 ? "+" : ""}${octave}`}>
              <Slider
                value={[octave]}
                min={-2}
                max={2}
                step={1}
                onValueChange={([v]) => setOctave(v ?? 0)}
              />
            </Setting>
            <Setting label="Diapazon (Klavishlar soni)" value={`${keyRange} ta`}>
              <div className="flex gap-1.5">
                {(["49", "61", "88"] as KeyRange[]).map((r) => (
                  <Button
                    key={r}
                    size="sm"
                    variant={keyRange === r ? "default" : "secondary"}
                    onClick={() => setKeyRange(r)}
                  >
                    {r === "61" ? "61 (Standart)" : r === "49" ? "49 (Katta)" : "88 (To'liq)"}
                  </Button>
                ))}
              </div>
            </Setting>
            <Setting
              label="Ekranga sig'dirish (Gorizontal skrolsiz)"
              value={fitScreen ? "Yoqiq" : "O'chiq"}
            >
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant={fitScreen ? "default" : "secondary"}
                  onClick={() => setFitScreen(true)}
                >
                  Yoqiq (Skrolsiz)
                </Button>
                <Button
                  size="sm"
                  variant={!fitScreen ? "default" : "secondary"}
                  onClick={() => setFitScreen(false)}
                >
                  O'chiq (Erkin zoom)
                </Button>
              </div>
            </Setting>
            {!fitScreen && (
              <Setting label="Klavish o'lchami (Zoom)" value={`${zoom}px`}>
                <Slider
                  value={[zoom]}
                  min={20}
                  max={52}
                  step={1}
                  onValueChange={([v]) => setZoom(v ?? 0)}
                />
              </Setting>
            )}
            <Setting label="Klavish yozuvlari" value="">
              <div className="flex gap-1">
                {(["keys", "notes", "none"] as LabelMode[]).map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={labelMode === m ? "default" : "secondary"}
                    onClick={() => setLabelMode(m)}
                  >
                    {m === "keys" ? "Klaviaturadagi harflar" : m === "notes" ? "Notalar" : "Toza"}
                  </Button>
                ))}
              </div>
            </Setting>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Setting({
  label,
  value,
  children,
}: {
  label: React.ReactNode;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">{label}</span>
        <span className="font-mono text-muted-foreground">{value}</span>
      </div>
      {children}
    </div>
  );
}

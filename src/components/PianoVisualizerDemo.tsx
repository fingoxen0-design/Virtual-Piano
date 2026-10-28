import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Play, Pause, Volume2, VolumeX, RotateCcw, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initAudio, noteOn, noteOff, stopAllAudio } from "@/lib/piano";

// Für Elise melody note events: { note: midi, start: ms, duration: ms }
const FURELISE_NOTES = [
  { midi: 76, t: 0, d: 250 }, // E5
  { midi: 75, t: 260, d: 250 }, // D#5
  { midi: 76, t: 520, d: 250 }, // E5
  { midi: 75, t: 780, d: 250 }, // D#5
  { midi: 76, t: 1040, d: 250 }, // E5
  { midi: 71, t: 1300, d: 250 }, // B4
  { midi: 74, t: 1560, d: 250 }, // D5
  { midi: 72, t: 1820, d: 250 }, // C5
  { midi: 69, t: 2080, d: 500 }, // A4
  { midi: 60, t: 2700, d: 250 }, // C4
  { midi: 64, t: 2960, d: 250 }, // E4
  { midi: 69, t: 3220, d: 250 }, // A4
  { midi: 71, t: 3480, d: 500 }, // B4
  { midi: 64, t: 4100, d: 250 }, // E4
  { midi: 68, t: 4360, d: 250 }, // G#4
  { midi: 71, t: 4620, d: 250 }, // B4
  { midi: 72, t: 4880, d: 500 }, // C5
  { midi: 64, t: 5500, d: 250 }, // E4
  { midi: 76, t: 5760, d: 250 }, // E5
  { midi: 75, t: 6020, d: 250 }, // D#5
  { midi: 76, t: 6280, d: 250 }, // E5
  { midi: 75, t: 6540, d: 250 }, // D#5
  { midi: 76, t: 6800, d: 250 }, // E5
  { midi: 71, t: 7060, d: 250 }, // B4
  { midi: 74, t: 7320, d: 250 }, // D5
  { midi: 72, t: 7580, d: 250 }, // C5
  { midi: 69, t: 7840, d: 600 }, // A4
];

const TOTAL_LOOP_MS = 9000;

export function PianoVisualizerDemo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [progress, setProgress] = useState(0);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  const activeNotesRef = useRef(new Set<number>());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const startTime = performance.now();
    let lastSoundCheckTime = -1;

    // Keys range: C4 (60) to C6 (84) for visualizer
    const minMidi = 58;
    const maxMidi = 78;
    const totalKeys = maxMidi - minMidi + 1;

    const render = (now: number) => {
      if (!isPlayingRef.current) {
        animId = requestAnimationFrame(render);
        return;
      }

      const elapsed = (now - startTime) % TOTAL_LOOP_MS;
      setProgress((elapsed / TOTAL_LOOP_MS) * 100);

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Background
      const isDark = document.documentElement.classList.contains("dark");
      ctx.fillStyle = isDark ? "#09090b" : "#f4f4f5";
      ctx.fillRect(0, 0, width, height);

      // Subtle grid lines
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)";
      ctx.lineWidth = 1;
      const keyWidth = width / totalKeys;

      for (let i = 0; i <= totalKeys; i++) {
        const x = i * keyWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height - 48);
        ctx.stroke();
      }

      const pianoTop = height - 48;
      const fallSpeed = 0.16; // pixels per ms
      const hitWindow = 350; // ms to fall down

      const currentHitMidis = new Set<number>();

      // Draw falling notes
      FURELISE_NOTES.forEach((note) => {
        const xIndex = note.midi - minMidi;
        if (xIndex < 0 || xIndex >= totalKeys) return;
        const x = xIndex * keyWidth + 2;
        const w = keyWidth - 4;

        // Position based on time
        const timeDiff = note.t - elapsed;
        const y = pianoTop - (timeDiff * fallSpeed + note.d * fallSpeed);
        const barHeight = note.d * fallSpeed;

        // Note is hitting the keyboard right now
        if (elapsed >= note.t && elapsed <= note.t + note.d) {
          currentHitMidis.add(note.midi);

          // Trigger audio if enabled and not already playing
          if (
            soundRef.current &&
            Math.abs(elapsed - note.t) < 40 &&
            Math.abs(elapsed - lastSoundCheckTime) > 30
          ) {
            lastSoundCheckTime = elapsed;
            void initAudio().then(() => {
              noteOn(note.midi, 0.75);
              setTimeout(() => noteOff(note.midi), note.d);
            });
          }
        }

        // Draw note bar if visible
        if (y + barHeight > 0 && y < pianoTop) {
          const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
          gradient.addColorStop(0, "rgba(245, 158, 11, 0.9)");
          gradient.addColorStop(1, "rgba(217, 119, 6, 0.95)");

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, Math.max(0, y), w, Math.min(barHeight, pianoTop - y), 4);
          ctx.fill();

          // Glow effect
          ctx.shadowColor = "rgba(245, 158, 11, 0.4)";
          ctx.shadowBlur = 8;
        }
      });

      ctx.shadowBlur = 0;

      // Piano Key Bed Frame
      ctx.fillStyle = isDark ? "#121215" : "#e4e4e7";
      ctx.fillRect(0, pianoTop, width, 48);

      // Crimson Felt Strip
      const feltGrad = ctx.createLinearGradient(0, pianoTop, width, pianoTop);
      feltGrad.addColorStop(0, "#7f1d1d");
      feltGrad.addColorStop(0.5, "#b91c1c");
      feltGrad.addColorStop(1, "#7f1d1d");
      ctx.fillStyle = feltGrad;
      ctx.fillRect(0, pianoTop, width, 3);

      // Draw Keys at bottom
      for (let i = 0; i < totalKeys; i++) {
        const midi = minMidi + i;
        const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
        const isHit = currentHitMidis.has(midi);
        const x = i * keyWidth;

        if (isHit) {
          // Pressed key
          ctx.fillStyle = "#f59e0b";
          ctx.fillRect(x + 1, pianoTop + 4, keyWidth - 2, 44);

          // Impact ripple / splash light
          ctx.fillStyle = "rgba(245, 158, 11, 0.35)";
          ctx.beginPath();
          ctx.arc(x + keyWidth / 2, pianoTop, 18, 0, Math.PI * 2);
          ctx.fill();
        } else if (isBlack) {
          ctx.fillStyle = isDark ? "#1c1c20" : "#27272a";
          ctx.fillRect(x + 1, pianoTop + 4, keyWidth - 2, 30);
        } else {
          ctx.fillStyle = isDark ? "#e4e4e7" : "#ffffff";
          ctx.fillRect(x + 1, pianoTop + 4, keyWidth - 2, 44);
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      stopAllAudio();
    };
  }, []);

  const toggleSound = useCallback(async () => {
    if (!soundEnabled) {
      await initAudio();
      setSoundEnabled(true);
    } else {
      setSoundEnabled(false);
      stopAllAudio();
    }
  }, [soundEnabled]);

  return (
    <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-white/[0.1] bg-[#121215] shadow-2xl transition-colors duration-200">
      {/* Top Header / Video Player Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-neutral-900/90 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-serif text-sm font-bold text-neutral-100">Für Elise</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleSound}
            className="h-8 gap-1.5 text-xs text-neutral-300 hover:text-white"
            title={soundEnabled ? "Tovushni o'chirish" : "Tovushni yoqish"}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="size-4 text-amber-400" />
                <span>Ovoz yoqiq</span>
              </>
            ) : (
              <>
                <VolumeX className="size-4 text-neutral-400" />
                <span>Ovoz o'chiq</span>
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-8 size-8 p-0 text-neutral-300 hover:text-white"
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-current" />}
          </Button>
        </div>
      </div>

      {/* Visualizer Canvas Area */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-[#09090b]">
        <canvas ref={canvasRef} className="h-full w-full block cursor-pointer" />

        {/* Floating Play Full Song CTA Button */}
        <div className="absolute right-4 bottom-14 z-20">
          <Link to="/play" search={{ song: "furelise" }}>
            <Button
              size="sm"
              className="gap-2 bg-neutral-100 text-neutral-900 hover:bg-white font-medium text-xs shadow-xl backdrop-blur-md"
            >
              <Sparkles className="size-3.5 text-amber-600" />
              Studiyada to'liq chalish
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Scrubber / Progress Bar */}
      <div className="relative h-1.5 w-full bg-neutral-800">
        <div
          className="h-full bg-amber-500 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

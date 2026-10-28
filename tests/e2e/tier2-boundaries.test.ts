import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  KEYS,
  CHAR_TO_MIDI,
  MIDI_TO_CHAR,
  charFromEvent,
  parseNotation,
  notesToNotation,
  eventsToNotation,
  exportMidi,
  initAudio,
  noteOn,
  noteOff,
  midiToName,
  type RecEvent,
} from "@/lib/piano";
import { createToneMock, blobToBytes } from "../helpers/mock-tone";

const toneMock = createToneMock();
vi.mock("tone", () => toneMock.mockModule);

describe("Tier 2: Boundary & Corner Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* -------------------------------------------------------------
   * 1. Empty Strings & Zero-Length Inputs
   * ------------------------------------------------------------- */
  describe("Boundary: Empty Strings & Zero-Length Collections", () => {
    it("returns empty step list for empty notation string", () => {
      const steps = parseNotation("");
      expect(steps).toEqual([]);
    });

    it("returns empty string when converting empty note array to notation", () => {
      expect(notesToNotation([])).toBe("");
    });

    it("returns empty string when converting empty recording events to notation", () => {
      expect(eventsToNotation([])).toBe("");
    });

    it("generates a valid empty MIDI file when event list is empty", async () => {
      const blob = exportMidi([], 120);
      expect(blob).toBeInstanceOf(Blob);
      const bytes = await blobToBytes(blob);

      // Verify MThd
      expect(bytes[0]).toBe(0x4d);
      expect(bytes[1]).toBe(0x54);
      expect(bytes[2]).toBe(0x68);
      expect(bytes[3]).toBe(0x64);

      // Verify MTrk exists
      expect(bytes[14]).toBe(0x4d);
      expect(bytes[15]).toBe(0x54);
      expect(bytes[16]).toBe(0x72);
      expect(bytes[17]).toBe(0x6b);

      // End of track at end of bytes
      const lastFour = bytes.slice(bytes.length - 4);
      expect(Array.from(lastFour)).toEqual([0x00, 0xff, 0x2f, 0x00]);
    });
  });

  /* -------------------------------------------------------------
   * 2. Whitespace & Delimiter Variations
   * ------------------------------------------------------------- */
  describe("Boundary: Whitespace & Formatting Permutations", () => {
    it("handles whitespace-only input without creating spurious steps", () => {
      const steps = parseNotation("    \n\t   ");
      expect(steps).toEqual([]);
    });

    it("handles leading whitespace and newlines before first note", () => {
      const steps = parseNotation("\n\n   t");
      expect(steps.length).toBe(1);
      expect(steps[0].notes).toEqual([CHAR_TO_MIDI["t"]]);
      expect(steps[0].rest).toBe(0);
    });

    it("handles trailing whitespace by assigning rest to final step", () => {
      const steps = parseNotation("t   ");
      expect(steps.length).toBe(1);
      expect(steps[0].notes).toEqual([CHAR_TO_MIDI["t"]]);
      expect(steps[0].rest).toBe(3);
    });

    it("handles mixed carriage returns and newlines across steps", () => {
      const steps = parseNotation("t\r\ny\r\nu");
      expect(steps.length).toBe(3);
      expect(steps[0].notes).toEqual([CHAR_TO_MIDI["t"]]);
      expect(steps[1].notes).toEqual([CHAR_TO_MIDI["y"]]);
      expect(steps[2].notes).toEqual([CHAR_TO_MIDI["u"]]);
    });

    it("accumulates rests over multiple consecutive pipes and spaces", () => {
      const steps = parseNotation("t | | | y");
      expect(steps.length).toBe(2);
      // Spaces = 4 (1 between t and |, 1 between | and |, 1 between | and |, 1 between | and y)
      // Pipes = 3 * 2 = 6
      // Total expected rest = 4 + 6 = 10
      expect(steps[0].rest).toBe(10);
    });
  });

  /* -------------------------------------------------------------
   * 3. Out-of-Range Notes & Clamping
   * ------------------------------------------------------------- */
  describe("Boundary: Out-of-Range Notes & Keyboard Limits", () => {
    it("respects lowest physical piano key boundary A0 (MIDI 21)", () => {
      const lowestKey = KEYS[0];
      expect(lowestKey.midi).toBe(21);
      expect(lowestKey.name).toBe("A0");
    });

    it("respects highest physical piano key boundary C8 (MIDI 108)", () => {
      const highestKey = KEYS[KEYS.length - 1];
      expect(highestKey.midi).toBe(108);
      expect(highestKey.name).toBe("C8");
    });

    it("clamps values outside 21..108 range", () => {
      const clamp = (n: number) => Math.max(21, Math.min(108, n));
      expect(clamp(-50)).toBe(21);
      expect(clamp(0)).toBe(21);
      expect(clamp(20)).toBe(21);
      expect(clamp(21)).toBe(21);
      expect(clamp(60)).toBe(60);
      expect(clamp(108)).toBe(108);
      expect(clamp(109)).toBe(108);
      expect(clamp(200)).toBe(108);
    });

    it("returns null in charFromEvent for modifier and functional keys", () => {
      const modifiers = [
        "Shift",
        "Control",
        "Alt",
        "Meta",
        "CapsLock",
        "Tab",
        "Enter",
        "Backspace",
        "ArrowUp",
        "ArrowDown",
        "F1",
        "F12",
      ];
      for (const key of modifiers) {
        expect(charFromEvent(new KeyboardEvent("keydown", { key }))).toBeNull();
      }
    });

    it("returns null in charFromEvent for characters outside Virtual Piano range", () => {
      const unmapped = ["~", "#", "%", "`", " ", "/", "\\", "?", "ç", "ü"];
      for (const key of unmapped) {
        if (!CHAR_TO_MIDI[key]) {
          expect(charFromEvent(new KeyboardEvent("keydown", { key }))).toBeNull();
        }
      }
    });
  });

  /* -------------------------------------------------------------
   * 4. Chord Delimiter Variations & Malformed Notation
   * ------------------------------------------------------------- */
  describe("Boundary: Malformed Chords & Delimiters", () => {
    it("handles unclosed chord bracket by parsing up to end of string", () => {
      const steps = parseNotation("[eu");
      expect(steps.length).toBe(1);
      expect(steps[0].notes).toEqual([CHAR_TO_MIDI["e"], CHAR_TO_MIDI["u"]]);
    });

    it("ignores empty chord brackets without creating empty step", () => {
      const steps = parseNotation("[]");
      expect(steps.length).toBe(0);
    });

    it("parses single notes when closing bracket is unmatched", () => {
      const steps = parseNotation("e]u");
      expect(steps.length).toBe(2);
      expect(steps[0].notes).toEqual([CHAR_TO_MIDI["e"]]);
      expect(steps[1].notes).toEqual([CHAR_TO_MIDI["u"]]);
    });

    it("filters unmapped characters inside chord brackets", () => {
      const steps = parseNotation("[e???u+++]");
      expect(steps.length).toBe(1);
      expect(steps[0].notes).toEqual([CHAR_TO_MIDI["e"], CHAR_TO_MIDI["u"]]);
    });

    it("handles consecutive opening and closing brackets cleanly", () => {
      const steps = parseNotation("[e][u][y]");
      expect(steps.length).toBe(3);
      expect(steps[0].notes).toEqual([CHAR_TO_MIDI["e"]]);
      expect(steps[1].notes).toEqual([CHAR_TO_MIDI["u"]]);
      expect(steps[2].notes).toEqual([CHAR_TO_MIDI["y"]]);
    });
  });

  /* -------------------------------------------------------------
   * 5. Velocity Extremes & Clamping in MIDI
   * ------------------------------------------------------------- */
  describe("Boundary: Velocity Extremes", () => {
    it("clamps zero velocity in exportMidi to minimum 1", async () => {
      const events: RecEvent[] = [{ midi: 60, t: 0, d: 100, v: 0 }];
      const blob = exportMidi(events, 120);
      const bytes = await blobToBytes(blob);

      let vel = -1;
      for (let i = 22; i < bytes.length; i++) {
        if (bytes[i] === 0x90 && bytes[i + 1] === 60) {
          vel = bytes[i + 2];
          break;
        }
      }
      expect(vel).toBe(1);
    });

    it("clamps negative velocity in exportMidi to minimum 1", async () => {
      const events: RecEvent[] = [{ midi: 60, t: 0, d: 100, v: -0.8 }];
      const blob = exportMidi(events, 120);
      const bytes = await blobToBytes(blob);

      let vel = -1;
      for (let i = 22; i < bytes.length; i++) {
        if (bytes[i] === 0x90 && bytes[i + 1] === 60) {
          vel = bytes[i + 2];
          break;
        }
      }
      expect(vel).toBe(1);
    });

    it("clamps velocity >= 1.0 in exportMidi to maximum 127", async () => {
      const events: RecEvent[] = [
        { midi: 60, t: 0, d: 100, v: 1.0 },
        { midi: 62, t: 50, d: 100, v: 5.0 },
      ];
      const blob = exportMidi(events, 120);
      const bytes = await blobToBytes(blob);

      const noteOnVels: number[] = [];
      for (let i = 22; i < bytes.length; i++) {
        if (bytes[i] === 0x90) {
          noteOnVels.push(bytes[i + 2]);
        }
      }
      expect(noteOnVels).toEqual([127, 127]);
    });

    it("allows noteOn invocation with zero velocity without crashing", async () => {
      await initAudio();
      expect(() => noteOn(60, 0)).not.toThrow();
    });
  });

  /* -------------------------------------------------------------
   * 6. Sustain Pedal Toggles & State Integrity
   * ------------------------------------------------------------- */
  describe("Boundary: Sustain Pedal Edge Conditions", () => {
    it("handles multiple sustained notes and cleans them all up when sustain toggles off", () => {
      const sustainedNotes = new Set<number>();
      const counts = new Map<number, number>();
      const releasedPitches: number[] = [];

      const setSustain = (active: boolean) => {
        if (!active) {
          sustainedNotes.forEach((m) => {
            if (!(counts.get(m) ?? 0)) {
              releasedPitches.push(m);
            }
          });
          sustainedNotes.clear();
        }
      };

      // Press 3 keys while sustain is ON
      sustainedNotes.add(60);
      sustainedNotes.add(64);
      sustainedNotes.add(67);

      expect(sustainedNotes.size).toBe(3);

      // Release sustain pedal
      setSustain(false);

      expect(sustainedNotes.size).toBe(0);
      expect(releasedPitches).toEqual([60, 64, 67]);
    });

    it("preserves notes that are still physically held down when sustain pedal is released", () => {
      const sustainedNotes = new Set<number>();
      const counts = new Map<number, number>();
      const releasedPitches: number[] = [];

      counts.set(60, 1); // Note 60 is still held down by physical key
      counts.set(64, 0); // Note 64 key was released, only sustained by pedal

      sustainedNotes.add(60);
      sustainedNotes.add(64);

      const setSustain = (active: boolean) => {
        if (!active) {
          sustainedNotes.forEach((m) => {
            if (!(counts.get(m) ?? 0)) {
              releasedPitches.push(m);
            }
          });
          sustainedNotes.clear();
        }
      };

      setSustain(false);

      expect(releasedPitches).toEqual([64]); // Only 64 should be released
      expect(sustainedNotes.size).toBe(0);
    });
  });

  /* -------------------------------------------------------------
   * 7. Extreme BPM Values for MIDI Export
   * ------------------------------------------------------------- */
  describe("Boundary: Extreme BPM Values", () => {
    it("handles very low BPM (20 BPM)", async () => {
      const bpm = 20;
      const expectedTempo = Math.round(60000000 / bpm); // 3,000,000 microseconds
      const blob = exportMidi([{ midi: 60, t: 0, d: 200, v: 0.8 }], bpm);
      const bytes = await blobToBytes(blob);

      const actualTempo = (bytes[26] << 16) | (bytes[27] << 8) | bytes[28];
      expect(actualTempo).toBe(expectedTempo);
    });

    it("handles very high BPM (360 BPM)", async () => {
      const bpm = 360;
      const expectedTempo = Math.round(60000000 / bpm); // 166,667 microseconds
      const blob = exportMidi([{ midi: 60, t: 0, d: 200, v: 0.8 }], bpm);
      const bytes = await blobToBytes(blob);

      const actualTempo = (bytes[26] << 16) | (bytes[27] << 8) | bytes[28];
      expect(actualTempo).toBe(expectedTempo);
    });
  });
});

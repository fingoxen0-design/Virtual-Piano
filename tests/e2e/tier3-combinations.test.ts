import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CHAR_TO_MIDI,
  MIDI_TO_CHAR,
  parseNotation,
  notesToNotation,
  eventsToNotation,
  exportMidi,
  initAudio,
  noteOn,
  noteOff,
  type RecEvent,
  type Step,
} from "@/lib/piano";
import { type Song } from "@/lib/songs";
import { createToneMock, blobToBytes } from "../helpers/mock-tone";

const toneMock = createToneMock();
vi.mock("tone", () => toneMock.mockModule);

describe("Tier 3: Cross-Feature Interactions & Combinations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toneMock.resetState();
  });

  /* -------------------------------------------------------------
   * 1. Sustain Pedal + Glissando Interaction
   * ------------------------------------------------------------- */
  describe("Combination: Sustain Pedal & Touch/Pointer Glissando", () => {
    it("preserves ringing notes during glissando sliding when sustain is active", async () => {
      await initAudio();

      // State machines simulating VirtualPiano glissando & sustain
      let sustainActive = false;
      const held = new Map<string, number>();
      const sustained = new Set<number>();
      const counts = new Map<number, number>();
      const pointerKey = new Map<number, number>();

      const setSustain = (active: boolean) => {
        sustainActive = active;
        if (!active) {
          sustained.forEach((m) => {
            if (!(counts.get(m) ?? 0)) {
              noteOff(m);
            }
          });
          sustained.clear();
        }
      };

      const sound = (midi: number, vel = 0.8) => {
        counts.set(midi, (counts.get(midi) ?? 0) + 1);
        if (sustained.has(midi)) {
          sustained.delete(midi);
          noteOff(midi);
        }
        noteOn(midi, vel);
      };

      const unsound = (midi: number) => {
        const c = (counts.get(midi) ?? 1) - 1;
        counts.set(midi, c);
        if (c > 0) return;
        if (sustainActive) {
          sustained.add(midi);
        } else {
          noteOff(midi);
        }
      };

      const press = (id: string, midi: number, vel = 0.8) => {
        if (held.has(id)) return;
        held.set(id, midi);
        sound(midi, vel);
      };

      const release = (id: string) => {
        const m = held.get(id);
        if (m === undefined) return;
        held.delete(id);
        unsound(m);
      };

      // 1. Engage sustain pedal
      setSustain(true);

      // 2. Simulate mouse/finger dragging across C4, D4, E4, F4, G4 (MIDI 60, 62, 64, 65, 67)
      const pointerId = 1;
      const glissandoNotes = [60, 62, 64, 65, 67];

      // Pointer down on first note (60)
      pointerKey.set(pointerId, glissandoNotes[0]);
      press(`p:${pointerId}`, glissandoNotes[0], 0.75);

      // Slide to next notes
      for (let i = 1; i < glissandoNotes.length; i++) {
        const prevNote = pointerKey.get(pointerId)!;
        const nextNote = glissandoNotes[i];

        // Release previous key from pointer
        release(`p:${pointerId}`);
        pointerKey.set(pointerId, nextNote);
        press(`p:${pointerId}`, nextNote, 0.7);

        // Previous note must now be in sustained set, NOT cut off by noteOff
        expect(sustained.has(prevNote)).toBe(true);
      }

      // Pointer up at end of glissando
      release(`p:${pointerId}`);
      pointerKey.delete(pointerId);

      // All 5 glissando notes should be sustained simultaneously
      expect(sustained.size).toBe(5);
      for (const note of glissandoNotes) {
        expect(sustained.has(note)).toBe(true);
      }

      // No notes should have received noteOff yet while sustain was held
      expect(toneMock.state.activeReleases.length).toBe(0);

      // 3. Release sustain pedal -> all 5 notes damped simultaneously
      setSustain(false);
      expect(sustained.size).toBe(0);
      expect(toneMock.state.activeReleases.length).toBe(5);
      const releasedNotes = toneMock.state.activeReleases.map((r) => r.note);
      expect(releasedNotes).toEqual(["C4", "D4", "E4", "F4", "G4"]);
    });
  });

  /* -------------------------------------------------------------
   * 2. Custom Sheet Parsing + Practice Mode Integration
   * ------------------------------------------------------------- */
  describe("Combination: Custom Sheet Parsing & Practice Engine", () => {
    it("loads custom sheet from storage and validates step-by-step chord execution", () => {
      // 1. Create custom song sheet with single notes and chords
      const customSheet = "[eu] o | p [ya]";
      const customSong: Song = {
        id: "custom-combo-1",
        title: "Test Combo",
        artist: "Tester",
        difficulty: "Medium",
        genre: "Custom",
        bpm: 110,
        sheet: customSheet,
      };

      // 2. Save and load from storage
      localStorage.setItem("vp:sheets", JSON.stringify([customSong]));
      const retrieved = JSON.parse(localStorage.getItem("vp:sheets") || "[]")[0] as Song;
      expect(retrieved.id).toBe("custom-combo-1");

      // 3. Parse into practice steps
      const steps = parseNotation(retrieved.sheet);
      expect(steps.length).toBe(4);

      // Step 0: [eu] (E4 and G4)
      const eMidi = CHAR_TO_MIDI["e"];
      const uMidi = CHAR_TO_MIDI["u"];
      expect(steps[0].notes).toEqual([eMidi, uMidi]);

      // Step 1: o (B4)
      const oMidi = CHAR_TO_MIDI["o"];
      expect(steps[1].notes).toEqual([oMidi]);

      // Step 2: p (C5)
      const pMidi = CHAR_TO_MIDI["p"];
      expect(steps[2].notes).toEqual([pMidi]);

      // Step 3: [ya] (D4 and E5)
      const yMidi = CHAR_TO_MIDI["y"];
      const aMidi = CHAR_TO_MIDI["a"];
      expect(steps[3].notes).toEqual([yMidi, aMidi]);

      // 4. Practice Mode Runner Simulation
      let currentStepIdx = 0;
      const practiceHit = new Set<number>();
      let practiceCompleted = false;

      const triggerPracticeInput = (inputMidi: number) => {
        if (currentStepIdx < 0 || currentStepIdx >= steps.length) return;
        const need = steps[currentStepIdx].notes;
        if (!need.includes(inputMidi)) return; // Wrong key ignored

        practiceHit.add(inputMidi);
        if (need.every((n) => practiceHit.has(n))) {
          practiceHit.clear();
          currentStepIdx += 1;
          if (currentStepIdx >= steps.length) {
            practiceCompleted = true;
          }
        }
      };

      // Test Step 0: chord [eu]
      // Hit only 'e' -> step should NOT advance yet
      triggerPracticeInput(eMidi);
      expect(currentStepIdx).toBe(0);
      expect(practiceCompleted).toBe(false);

      // Hit wrong note 't' -> step should NOT advance
      triggerPracticeInput(CHAR_TO_MIDI["t"]);
      expect(currentStepIdx).toBe(0);

      // Hit 'u' -> step advances to 1
      triggerPracticeInput(uMidi);
      expect(currentStepIdx).toBe(1);

      // Test Step 1: single note 'o'
      triggerPracticeInput(oMidi);
      expect(currentStepIdx).toBe(2);

      // Test Step 2: single note 'p'
      triggerPracticeInput(pMidi);
      expect(currentStepIdx).toBe(3);

      // Test Step 3: chord [ya]
      triggerPracticeInput(yMidi);
      expect(currentStepIdx).toBe(3);
      triggerPracticeInput(aMidi);
      expect(currentStepIdx).toBe(4);
      expect(practiceCompleted).toBe(true);

      localStorage.removeItem("vp:sheets");
    });
  });

  /* -------------------------------------------------------------
   * 3. Recording Stream + Notation Transcription + MIDI Export Roundtrip
   * ------------------------------------------------------------- */
  describe("Combination: Recording Stream to Notation & MIDI Export Roundtrip", () => {
    it("converts recorded note events to notation and MIDI file with matched structure", async () => {
      // Sequence: C4 (t), then D4 (y), then pause > 600ms, then chord [E4, G4] ([eu])
      const tMidi = CHAR_TO_MIDI["t"]; // C4
      const yMidi = CHAR_TO_MIDI["y"]; // D4
      const eMidi = CHAR_TO_MIDI["e"]; // E3
      const uMidi = CHAR_TO_MIDI["u"]; // E4

      const recordingEvents: RecEvent[] = [
        { midi: tMidi, t: 100, d: 250, v: 0.8 },
        { midi: yMidi, t: 400, d: 250, v: 0.85 },
        // Chord [eu] at t=1200ms (gap of 800ms between y and e adds '|')
        { midi: eMidi, t: 1200, d: 300, v: 0.9 },
        { midi: uMidi, t: 1215, d: 300, v: 0.9 }, // Within 40ms threshold for chord grouping
      ];

      // 1. Transcribe to notation string
      const notation = eventsToNotation(recordingEvents);
      expect(notation).toContain("t");
      expect(notation).toContain("y");
      expect(notation).toContain("|");
      expect(notation).toContain(`[${MIDI_TO_CHAR[eMidi]}${MIDI_TO_CHAR[uMidi]}]`);

      // 2. Parse transcribed notation back
      const parsedSteps = parseNotation(notation);
      expect(parsedSteps.length).toBe(3); // 't', 'y', and chord '[eu]'
      expect(parsedSteps[0].notes).toEqual([tMidi]);
      expect(parsedSteps[1].notes).toEqual([yMidi]);
      expect(parsedSteps[2].notes).toEqual([eMidi, uMidi]);

      // 3. Export to MIDI
      const midiBlob = exportMidi(recordingEvents, 120);
      const bytes = await blobToBytes(midiBlob);

      // Verify MIDI file has exactly 4 note-on messages (t, y, e, u) and 4 note-off messages
      let noteOnCount = 0;
      let noteOffCount = 0;
      for (let i = 22; i < bytes.length; i++) {
        if (bytes[i] === 0x90) noteOnCount++;
        if (bytes[i] === 0x80) noteOffCount++;
      }
      expect(noteOnCount).toBe(4);
      expect(noteOffCount).toBe(4);
    });
  });

  /* -------------------------------------------------------------
   * 4. Web MIDI API Hardware Message Decoding
   * ------------------------------------------------------------- */
  describe("Combination: Web MIDI Messages & Damper Pedal Handling", () => {
    it("processes MIDI byte streams (NoteOn, NoteOff, CC 64 Damper Pedal)", () => {
      const activeNotes = new Set<number>();
      let sustainActive = false;

      const handleMidiMessage = (data: Uint8Array) => {
        const st = data[0] ?? 0;
        const n = data[1] ?? 0;
        const v = data[2] ?? 0;
        const cmd = st & 0xf0;

        if (cmd === 0x90 && v > 0) {
          activeNotes.add(n);
        } else if (cmd === 0x80 || (cmd === 0x90 && v === 0)) {
          if (!sustainActive) {
            activeNotes.delete(n);
          }
        } else if (cmd === 0xb0 && n === 64) {
          // CC 64 Damper Pedal
          sustainActive = v >= 64;
          if (!sustainActive) {
            activeNotes.clear();
          }
        }
      };

      // 1. Note On: C4 (60) with velocity 100
      handleMidiMessage(new Uint8Array([0x90, 60, 100]));
      expect(activeNotes.has(60)).toBe(true);

      // 2. Press Damper Pedal (CC 64 = 127)
      handleMidiMessage(new Uint8Array([0xb0, 64, 127]));
      expect(sustainActive).toBe(true);

      // 3. Physical Note Off: C4 (0x80, 60, 0)
      // Note should REMAIN in activeNotes because damper pedal is depressed!
      handleMidiMessage(new Uint8Array([0x80, 60, 0]));
      expect(activeNotes.has(60)).toBe(true);

      // 4. Note On with Running Status / Velocity 0 (alternative note-off in MIDI)
      handleMidiMessage(new Uint8Array([0x90, 64, 90])); // E4 On
      expect(activeNotes.has(64)).toBe(true);

      handleMidiMessage(new Uint8Array([0x90, 64, 0])); // E4 Off (velocity 0)
      expect(activeNotes.has(64)).toBe(true); // Still sustained

      // 5. Release Damper Pedal (CC 64 = 0)
      handleMidiMessage(new Uint8Array([0xb0, 64, 0]));
      expect(sustainActive).toBe(false);
      expect(activeNotes.size).toBe(0); // All sustained notes released
    });
  });

  /* -------------------------------------------------------------
   * 5. Transposition & Octave Shift Keypress Resolution
   * ------------------------------------------------------------- */
  describe("Combination: Pitch Transposition & Octave Shift with Practice Mode", () => {
    it("resolves shifted sounding MIDI while allowing practice mode to match raw MIDI", () => {
      const clamp = (n: number) => Math.max(21, Math.min(108, n));

      // User has configured octave = +1 (+12 st) and transpose = +2 (+2 st)
      const octave = 1;
      const transpose = 2;

      // Base key pressed: 't' (C4 = 60)
      const rawMidi = CHAR_TO_MIDI["t"]; // 60
      const inputMidi = rawMidi + octave * 12; // 72
      const soundingMidi = clamp(inputMidi + transpose); // 74 (D5)

      expect(soundingMidi).toBe(74);

      // Practice mode checking logic from VirtualPiano:
      // checkPractice(inputMidi, rawMidi)
      // A song expecting C4 (60) should accept the keypress because rawMidi is 60!
      const neededNotes = [60];
      const matches = neededNotes.includes(inputMidi) || neededNotes.includes(rawMidi);
      expect(matches).toBe(true);
    });
  });
});

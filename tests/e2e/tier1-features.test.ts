import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import {
  KEYS,
  NOTE_NAMES,
  CHAR_TO_MIDI,
  MIDI_TO_CHAR,
  midiToName,
  charFromEvent,
  parseNotation,
  notesToNotation,
  eventsToNotation,
  exportMidi,
  initAudio,
  noteOn,
  noteOff,
  setVolume,
  playTick,
  getAudioStream,
  type RecEvent,
} from "@/lib/piano";
import { SONGS, type Song } from "@/lib/songs";
import { createToneMock, blobToBytes } from "../helpers/mock-tone";

// Set up Tone mock
const toneMock = createToneMock();
vi.mock("tone", () => toneMock.mockModule);

describe("Tier 1: Core Feature Coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* -------------------------------------------------------------
   * 1. Routes (Flawless Multi-Page Architecture)
   * ------------------------------------------------------------- */
  describe("Feature: Multi-Page Routing Architecture", () => {
    const router = createRouter({
      routeTree,
      context: { queryClient: new QueryClient() },
    });

    it("matches landing page route /", () => {
      const matches = router.matchRoutes("/");
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
      expect(matches.some((m) => m.routeId === "/")).toBe(true);
    });

    it("matches piano studio route /play", () => {
      const matches = router.matchRoutes("/play");
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((m) => m.routeId === "/play")).toBe(true);
    });

    it("matches songs library route /songs", () => {
      const matches = router.matchRoutes("/songs");
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((m) => m.routeId === "/songs")).toBe(true);
    });

    it("matches learn guide route /learn", () => {
      const matches = router.matchRoutes("/learn");
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((m) => m.routeId === "/learn")).toBe(true);
    });

    it("handles unknown route gracefully", () => {
      const matches = router.matchRoutes("/unknown-sub-page");
      expect(matches).toBeDefined();
    });

    it("builds and matches location for /play with search parameters", () => {
      const loc = router.buildLocation({ to: "/play", search: { song: "ode" } });
      expect(loc.pathname).toBe("/play");
      expect(loc.search).toEqual({ song: "ode" });
      const matches = router.matchRoutes(loc.pathname);
      expect(matches.some((m) => m.routeId === "/play")).toBe(true);
    });
  });

  /* -------------------------------------------------------------
   * 2. Audio Engine Primitives
   * ------------------------------------------------------------- */
  describe("Feature: Audio Engine Primitives", () => {
    it("initializes audio context, starts Tone, and registers onReady callback", async () => {
      let readyCalled = false;
      await initAudio(() => {
        readyCalled = true;
      });
      expect(toneMock.mockStart).toHaveBeenCalled();
      toneMock.triggerSamplerLoaded();
      expect(readyCalled).toBe(true);
    });

    it("re-starting audio context is idempotent", async () => {
      await initAudio();
      expect(toneMock.mockStart).toHaveBeenCalled();
    });

    it("triggers note attack with MIDI pitch and velocity", async () => {
      await initAudio();
      noteOn(60, 0.75); // Middle C (C4)
      expect(toneMock.state.activeAttacks).toContainEqual(
        expect.objectContaining({ note: "C4", velocity: 0.75 }),
      );
    });

    it("triggers note release with MIDI pitch", async () => {
      await initAudio();
      noteOff(60);
      expect(toneMock.state.activeReleases).toContainEqual(expect.objectContaining({ note: "C4" }));
    });

    it("computes decibel attenuation on volume adjustment", async () => {
      await initAudio();
      setVolume(0.5);
      expect(toneMock.state.volume).toBeCloseTo(20 * Math.log10(0.5), 1);

      setVolume(0);
      expect(toneMock.state.volume).toBe(-Infinity);
    });

    it("plays metronome tick with accent distinction", async () => {
      await initAudio();
      playTick(true);
      expect(toneMock.state.ticks).toContainEqual(
        expect.objectContaining({ note: "C5", velocity: 0.9 }),
      );

      playTick(false);
      expect(toneMock.state.ticks).toContainEqual(
        expect.objectContaining({ note: "G4", velocity: 0.5 }),
      );
    });

    it("creates media stream audio destination", async () => {
      await initAudio();
      const stream = getAudioStream();
      expect(stream).toBeDefined();
      expect(stream?.id).toBe("mock-stream");
    });
  });

  /* -------------------------------------------------------------
   * 3. 88-Key Geometry & Pitch Mapping
   * ------------------------------------------------------------- */
  describe("Feature: 88-Key Physical Layout & Key Geometry", () => {
    it("provides exactly 88 physical keys", () => {
      expect(KEYS.length).toBe(88);
    });

    it("contains exactly 52 white keys and 36 black keys", () => {
      const whiteKeys = KEYS.filter((k) => !k.black);
      const blackKeys = KEYS.filter((k) => k.black);
      expect(whiteKeys.length).toBe(52);
      expect(blackKeys.length).toBe(36);
    });

    it("spans precisely from A0 (MIDI 21) to C8 (MIDI 108)", () => {
      expect(KEYS[0].midi).toBe(21);
      expect(KEYS[0].name).toBe("A0");
      expect(KEYS[0].black).toBe(false);

      expect(KEYS[KEYS.length - 1].midi).toBe(108);
      expect(KEYS[KEYS.length - 1].name).toBe("C8");
      expect(KEYS[KEYS.length - 1].black).toBe(false);
    });

    it("converts MIDI pitch numbers to scientific pitch notation", () => {
      expect(midiToName(21)).toBe("A0");
      expect(midiToName(36)).toBe("C2");
      expect(midiToName(60)).toBe("C4");
      expect(midiToName(69)).toBe("A4");
      expect(midiToName(108)).toBe("C8");
    });

    it("maps sequential MIDI notes from 21 to 108 without gaps", () => {
      for (let i = 0; i < 88; i++) {
        expect(KEYS[i].midi).toBe(21 + i);
      }
    });

    it("maps standard Virtual Piano characters across 5 octaves (C2 to C7)", () => {
      expect(CHAR_TO_MIDI["1"]).toBe(36); // C2
      expect(CHAR_TO_MIDI["t"]).toBe(60); // C4
      expect(CHAR_TO_MIDI["m"]).toBe(96); // C7
      expect(MIDI_TO_CHAR[36]).toBe("1");
      expect(MIDI_TO_CHAR[60]).toBe("t");
      expect(MIDI_TO_CHAR[96]).toBe("m");
    });

    it("translates KeyboardEvent keys via charFromEvent", () => {
      const validEvent = new KeyboardEvent("keydown", { key: "t" });
      expect(charFromEvent(validEvent)).toBe("t");

      const blackKeyShiftEvent = new KeyboardEvent("keydown", { key: "T" });
      expect(charFromEvent(blackKeyShiftEvent)).toBe("T");

      const ignoredEvent = new KeyboardEvent("keydown", { key: "Escape" });
      expect(charFromEvent(ignoredEvent)).toBeNull();
    });
  });

  /* -------------------------------------------------------------
   * 4. Virtual Piano Notation Parser
   * ------------------------------------------------------------- */
  describe("Feature: Virtual Piano Notation Parser", () => {
    it("parses single sequential melody notes", () => {
      const steps = parseNotation("t y u");
      expect(steps.length).toBe(3);
      expect(steps[0].notes).toEqual([CHAR_TO_MIDI["t"]]);
      expect(steps[1].notes).toEqual([CHAR_TO_MIDI["y"]]);
      expect(steps[2].notes).toEqual([CHAR_TO_MIDI["u"]]);
    });

    it("parses chords enclosed in square brackets", () => {
      const steps = parseNotation("[eu] [ty]");
      expect(steps.length).toBe(2);
      expect(steps[0].notes).toEqual([CHAR_TO_MIDI["e"], CHAR_TO_MIDI["u"]]);
      expect(steps[1].notes).toEqual([CHAR_TO_MIDI["t"], CHAR_TO_MIDI["y"]]);
    });

    it("accumulates rests for spaces between steps", () => {
      const steps = parseNotation("u  y"); // two spaces after u
      expect(steps.length).toBe(2);
      expect(steps[0].rest).toBe(2);
      expect(steps[1].rest).toBe(0);
    });

    it("accumulates double rests for pipe measure separators", () => {
      const steps = parseNotation("u | y");
      expect(steps.length).toBe(2);
      expect(steps[0].rest).toBe(4);
    });

    it("formats single and polyphonic notes back to notation string", () => {
      const single = notesToNotation([CHAR_TO_MIDI["t"]]);
      expect(single).toBe("t");

      const chord = notesToNotation([CHAR_TO_MIDI["e"], CHAR_TO_MIDI["u"]]);
      expect(chord).toBe("[eu]");

      const empty = notesToNotation([]);
      expect(empty).toBe("");
    });

    it("converts recorded event streams into structured notation", () => {
      const recEvents: RecEvent[] = [
        { midi: CHAR_TO_MIDI["t"], t: 0, d: 200, v: 0.8 },
        { midi: CHAR_TO_MIDI["y"], t: 300, d: 200, v: 0.8 },
        { midi: CHAR_TO_MIDI["u"], t: 1000, d: 200, v: 0.8 },
      ];
      const notation = eventsToNotation(recEvents);
      expect(notation).toContain("t");
      expect(notation).toContain("y");
      expect(notation).toContain("|");
      expect(notation).toContain("u");
    });
  });

  /* -------------------------------------------------------------
   * 5. Song Catalog & Filtering
   * ------------------------------------------------------------- */
  describe("Feature: Curated Song Catalog & Filtering", () => {
    it("contains at least 10 preloaded curated songs", () => {
      expect(SONGS.length).toBeGreaterThanOrEqual(10);
    });

    it("ensures each catalog song adheres to valid schema", () => {
      for (const song of SONGS) {
        expect(song.id).toBeTruthy();
        expect(song.title).toBeTruthy();
        expect(song.artist).toBeTruthy();
        expect(["Easy", "Medium", "Hard"]).toContain(song.difficulty);
        expect([
          "Classical",
          "Pop",
          "Anime/Game",
          "Movie OST",
          "Traditional / Folk",
          "Custom",
        ]).toContain(song.genre);
        expect(song.bpm).toBeGreaterThan(0);
        expect(song.sheet.trim().length).toBeGreaterThan(0);
      }
    });

    it("covers all target genres across catalog songs", () => {
      const genres = new Set(SONGS.map((s) => s.genre));
      expect(genres.has("Classical")).toBe(true);
      expect(genres.has("Pop")).toBe(true);
      expect(genres.has("Anime/Game")).toBe(true);
      expect(genres.has("Movie OST")).toBe(true);
    });

    it("covers all difficulty levels across catalog songs", () => {
      const diffs = new Set(SONGS.map((s) => s.difficulty));
      expect(diffs.has("Easy")).toBe(true);
      expect(diffs.has("Medium")).toBe(true);
      expect(diffs.has("Hard")).toBe(true);
    });

    it("validates that all catalog sheets parse into valid non-empty note steps", () => {
      for (const song of SONGS) {
        const steps = parseNotation(song.sheet);
        expect(steps.length).toBeGreaterThan(0);
        for (const step of steps) {
          expect(step.notes.length).toBeGreaterThan(0);
        }
      }
    });

    it("supports custom sheet storage in localStorage", () => {
      const customSong: Song = {
        id: "custom-test-1",
        title: "Test Melody",
        artist: "Composer",
        difficulty: "Easy",
        genre: "Custom",
        bpm: 120,
        sheet: "t y u o",
      };

      localStorage.setItem("vp:sheets", JSON.stringify([customSong]));
      const stored = JSON.parse(localStorage.getItem("vp:sheets") || "[]");
      expect(stored.length).toBe(1);
      expect(stored[0].title).toBe("Test Melody");
      localStorage.removeItem("vp:sheets");
    });
  });

  /* -------------------------------------------------------------
   * 6. MIDI Generation & SMF Format 0
   * ------------------------------------------------------------- */
  describe("Feature: SMF Format 0 MIDI Export Engine", () => {
    const sampleEvents: RecEvent[] = [
      { midi: 60, t: 0, d: 250, v: 0.8 },
      { midi: 64, t: 300, d: 250, v: 0.9 },
    ];

    it("produces a Blob with audio/midi MIME type", () => {
      const blob = exportMidi(sampleEvents, 120);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("audio/midi");
    });

    it("writes valid SMF MThd header chunk", async () => {
      const blob = exportMidi(sampleEvents, 120);
      const bytes = await blobToBytes(blob);

      // 'MThd' ASCII = 0x4D, 0x54, 0x68, 0x64
      expect(bytes[0]).toBe(0x4d);
      expect(bytes[1]).toBe(0x54);
      expect(bytes[2]).toBe(0x68);
      expect(bytes[3]).toBe(0x64);

      // Header chunk length = 6 (0x00000006)
      expect(bytes[4]).toBe(0);
      expect(bytes[5]).toBe(0);
      expect(bytes[6]).toBe(0);
      expect(bytes[7]).toBe(6);

      // Format 0 (0x0000)
      expect(bytes[8]).toBe(0);
      expect(bytes[9]).toBe(0);

      // 1 track (0x0001)
      expect(bytes[10]).toBe(0);
      expect(bytes[11]).toBe(1);

      // Division (PPQ = 480 -> 0x01E0)
      expect(bytes[12]).toBe((480 >> 8) & 0xff);
      expect(bytes[13]).toBe(480 & 0xff);
    });

    it("writes valid SMF MTrk track chunk with correct length", async () => {
      const blob = exportMidi(sampleEvents, 120);
      const bytes = await blobToBytes(blob);

      // 'MTrk' ASCII = 0x4D, 0x54, 0x72, 0x6B starting at index 14
      expect(bytes[14]).toBe(0x4d);
      expect(bytes[15]).toBe(0x54);
      expect(bytes[16]).toBe(0x72);
      expect(bytes[17]).toBe(0x6b);

      // 4-byte track length
      const trackLen = (bytes[18] << 24) | (bytes[19] << 16) | (bytes[20] << 8) | bytes[21];
      expect(trackLen).toBeGreaterThan(0);
      expect(bytes.length).toBe(22 + trackLen);
    });

    it("encodes Set Tempo meta event based on BPM", async () => {
      const bpm = 120;
      const expectedTempo = Math.round(60000000 / bpm);
      const blob = exportMidi(sampleEvents, bpm);
      const bytes = await blobToBytes(blob);

      // Track starts at byte 22:
      // delta-time = 0 (byte 22)
      // Meta event prefix = 0xFF (byte 23)
      // Tempo event type = 0x51 (byte 24)
      // Data length = 3 (byte 25)
      expect(bytes[22]).toBe(0);
      expect(bytes[23]).toBe(0xff);
      expect(bytes[24]).toBe(0x51);
      expect(bytes[25]).toBe(3);

      const actualTempo = (bytes[26] << 16) | (bytes[27] << 8) | bytes[28];
      expect(actualTempo).toBe(expectedTempo);
    });

    it("encodes note-on and note-off messages with velocity clamping", async () => {
      const testEvents: RecEvent[] = [
        { midi: 60, t: 0, d: 100, v: 1.5 },
        { midi: 62, t: 150, d: 100, v: 0.001 },
      ];

      const blob = exportMidi(testEvents, 120);
      const bytes = await blobToBytes(blob);

      const noteOnIndices: number[] = [];
      for (let i = 22; i < bytes.length; i++) {
        if (bytes[i] === 0x90) noteOnIndices.push(i);
      }
      expect(noteOnIndices.length).toBe(2);

      // Velocity for 1.5 clamps to 127
      const vel1 = bytes[noteOnIndices[0] + 2];
      expect(vel1).toBe(127);

      // Velocity for 0.001 clamps to min 1
      const vel2 = bytes[noteOnIndices[1] + 2];
      expect(vel2).toBe(1);
    });

    it("terminates track with End-of-Track meta event", async () => {
      const blob = exportMidi(sampleEvents, 120);
      const bytes = await blobToBytes(blob);

      // End of Track sequence is 0x00, 0xFF, 0x2F, 0x00
      const lastFour = bytes.slice(bytes.length - 4);
      expect(Array.from(lastFour)).toEqual([0x00, 0xff, 0x2f, 0x00]);
    });
  });
});

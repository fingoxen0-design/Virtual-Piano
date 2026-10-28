# Project: Grand Virtual Piano ("Grand")

## Architecture

- **Framework**: TanStack Start v1.168.60 (SSR + Client Routing) + React 19.2.0 + Vite 8.1.5 + Tailwind CSS v4.
- **Audio Architecture**: Tone.js v15.1.22 with Salamander Grand Piano acoustic samples + multi-voice PolySynth fallback. Audio node chain: `[Sampler / PolySynth] -> Tone.Limiter(-1) -> Tone.Volume -> Tone.Destination` with immediate scheduling (`lookAhead = 0`) for true zero-latency response.
- **Visual Aesthetic**: Pure minimalist anti-RGB dark theme (`#09090b` / `#121215`). Ivory (`#fdfbf7`) & ebony (`#18181b`) 3D keycaps with physical travel, crimson felt strip (`#991b1b`), and warm acoustic golden amber active highlights (`#f59e0b` / `#d97706`).
- **Tooling & Connectivity**: Virtual Piano text notation parser, interactive step-by-step practice engine, RIFF WAV recording, SMF Format 0 MIDI recording/export, and Web MIDI API integration with damper pedal support.

## Feature Inventory

| #   | Feature                               | Description                                                                                 | Milestone | Source                   |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------- | --------- | ------------------------ |
| 1   | Zero-Latency Audio Scheduling         | Set `lookAhead = 0` / immediate note triggering in Tone.js to eliminate 100ms lag           | M1        | Survey (Explorer 2) & R3 |
| 2   | Robust Audio Initialization           | Fix race condition where early demo audio ignores `onReady`, persisting sampler status      | M1        | Survey (Explorer 2) & R3 |
| 3   | Audio Limiter & Anti-Clipping         | Insert `Tone.Limiter(-1)` in master bus to prevent digital clipping on chords/glissandos    | M1        | Survey (Explorer 2) & R3 |
| 4   | Acoustic Damper & Release Dynamics    | Natural release cutoff (~300ms) on pedal lift; dynamic velocity curves                      | M1        | Survey (Explorer 2) & R3 |
| 5   | Audio Memory Leak Prevention          | Clean disposal of audio context, nodes, media streams, and auto-play timers on unmount      | M1        | Survey (Explorer 2) & R3 |
| 6   | 88-Key Physical 3D Keyboard Layout    | Exact 52 white keys, 36 black keys (A0 to C8) with realistic bevels and spacing             | M2        | Survey (Explorer 3) & R3 |
| 7   | Fallboard Crimson Felt Strip          | Rich acoustic grand piano crimson felt runner along key bed base                            | M2        | Survey (Explorer 3) & R3 |
| 8   | Physical Key Travel & Anti-RGB Glow   | Physical 3D depression with warm golden amber glow; zero neon/gamer RGB                     | M2        | Survey (Explorer 3) & R1 |
| 9   | Smooth Touch & Mouse Glissando        | Uninhibited dragging across keys on mouse and mobile touch with pointer tracking            | M2        | Survey (Explorer 3) & R3 |
| 10  | Mini-Map Navigator & Auto-Centering   | 88-key overview with drag-scrubbing and responsive auto-centering for octaves               | M2        | Survey (Explorer 3) & R3 |
| 11  | Multi-Page Routing Architecture       | Flawless routing across `/`, `/play`, `/songs`, `/learn` with 200 OK                        | M3        | Survey (Explorer 1) & R2 |
| 12  | Type-Safe Route Search Params         | TanStack Router `validateSearch` on `/play` for `?song=<id>`                                | M3        | Survey (Explorer 1) & R2 |
| 13  | Pure Minimalist Anti-RGB Styling      | Global `#09090b` / `#121215` styling, meta theme-color `#09090b`, warm gold practice guides | M3        | Survey (Explorer 1) & R1 |
| 14  | UI Consistency & Copy Polish          | Consistent terminology, polished modals, accessible labels across all routes                | M3        | Survey (Explorer 1) & R1 |
| 15  | Robust Virtual Piano Notation Parser  | Full parser supporting single notes, chords `[abc]`, rests, dash rests, leading rests       | M4        | Survey (Explorer 3) & R4 |
| 16  | Curated Song Catalog & Filtering      | 10+ categorized songs with live search, genre filters, and one-click play                   | M4        | Survey (Explorer 3) & R4 |
| 17  | Interactive Practice Waiting Mode     | Step-by-step mode pausing until correct notes are struck; visual guide lighting             | M4        | Survey (Explorer 3) & R4 |
| 18  | Auto-Scrolling Sheet & Practice Tempo | Sheet text auto-scrolls to keep active chord centered; practice tempo slider                | M4        | Survey (Explorer 3) & R4 |
| 19  | Pure RIFF WAV Audio Recording Export  | Genuine 16-bit PCM RIFF `.wav` recording export replacing lossy webm                        | M5        | Survey (Explorer 3) & R4 |
| 20  | SMF Format 0 MIDI Recording Export    | High-resolution MIDI note capture exported as standard `.mid` file                          | M5        | Survey (Explorer 3) & R4 |
| 21  | Custom Sheet Creator with Storage     | Interactive custom sheet builder with syntax validation and localStorage save               | M5        | Survey (Explorer 3) & R4 |
| 22  | Web MIDI API Hardware Integration     | Plug & play MIDI input, velocity sensitivity, CC 64 damper pedal, unmount cleanup           | M5        | Survey (Explorer 3) & R4 |
| 23  | E2E 4-Tier Test Suite & Pass (100%)   | Verification of all requirements across Tiers 1-4 with 0 errors                             | M6        | Survey & Acceptance      |
| 24  | Adversarial Hardening (Tier 5)        | White-box stress-testing, boundary analysis, glissando & memory leak verification           | M6        | Project Pattern Phase 2  |

## Milestones

| #   | Name                                | Scope                   | Dependencies                      | Status      |
| --- | ----------------------------------- | ----------------------- | --------------------------------- | ----------- |
| M1  | Audio Engine & Acoustics            | Features 1, 2, 3, 4, 5  | none                              | IN_PROGRESS |
| M2  | 3D Keyboard Layout & Glissando      | Features 6, 7, 8, 9, 10 | M1 interface                      | PLANNED     |
| M3  | Multi-Page Routing & Anti-RGB UI    | Features 11, 12, 13, 14 | none                              | PLANNED     |
| M4  | Song Catalog, Notation & Practice   | Features 15, 16, 17, 18 | M1, M2                            | PLANNED     |
| M5  | Studio Tooling: WAV/MIDI & Web MIDI | Features 19, 20, 21, 22 | M1                                | PLANNED     |
| M6  | Final E2E Test Pass & Hardening     | Features 23, 24         | M1, M2, M3, M4, M5, TEST_READY.md | PLANNED     |

## Interface Contracts

### Audio Engine (`src/lib/piano.ts`) ↔ UI Components (`src/components/VirtualPiano.tsx`, `src/routes/index.tsx`)

- `initAudio(onReady?: (isSynth: boolean) => void): Promise<void>`: Returns promise, invokes `onReady` even if already initialized.
- `playNote(note: string, velocity?: number): void`: Immediate attack with velocity (0 to 1). Zero latency (`Tone.immediate()`).
- `stopNote(note: string): void`: Releases note with acoustic damper damping.
- `setSustain(active: boolean): void`: Toggles damper pedal. When false, damps any ringing sustained notes gracefully (~300ms).
- `disposeAudio(): void`: Releases all nodes, cancels timers, disposes audio context to prevent memory leaks.
- `recordAudioStart(): void`, `recordAudioStop(): Promise<Blob>`: Encodes genuine 16-bit PCM RIFF `.wav` Blob.

### Notation Parser (`src/lib/piano.ts`) ↔ Practice & Song Engine

- `parseNotation(sheet: string): ParsedStep[]`:
  - `ParsedStep = { notes: string[]; delay: number; raw: string; isRest?: boolean; stepIndex: number }`
  - Handles chords `[abc]`, single notes, spaces, dashes `-`, `~`, preserves delays.
- `noteToKeyMap(char: string): string | null`: Maps Virtual Piano character to standard note pitch (e.g. `1` -> `C2`, `q` -> `C4`).

### Code Layout

- `src/lib/piano.ts`: Audio engine, Tone.js management, pitch definitions, notation parser, MIDI export, WAV export.
- `src/components/VirtualPiano.tsx`: 88-key interactive studio component, key rendering, touch/mouse glissando, practice controller.
- `src/components/Navbar.tsx`: Global navigation header, route links, anti-RGB aesthetic.
- `src/components/Footer.tsx`: Global footer.
- `src/routes/__root.tsx`: Root HTML layout, meta theme-color `#09090b`.
- `src/routes/index.tsx`: `/` Home landing page with mini demo piano and feature showcases.
- `src/routes/play.tsx`: `/play` Full-screen piano studio.
- `src/routes/songs.tsx`: `/songs` Catalog and custom sheet creator.
- `src/routes/learn.tsx`: `/learn` Educational guides for mapping, notation, and MIDI.
- `tests/e2e/`: Requirement-driven opaque-box E2E test suite (Tiers 1-4).

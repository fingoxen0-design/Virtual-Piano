import { vi } from "vitest";

export interface ToneMockState {
  started: boolean;
  activeAttacks: Array<{ note: string; time: number; velocity: number }>;
  activeReleases: Array<{ note: string; time: number }>;
  ticks: Array<{ note: string; duration: string; time: number; velocity: number }>;
  samplerLoaded: boolean;
  volume: number;
}

export function createToneMock() {
  const state: ToneMockState = {
    started: false,
    activeAttacks: [],
    activeReleases: [],
    ticks: [],
    samplerLoaded: false,
    volume: 0,
  };

  const mockStart = vi.fn().mockImplementation(async () => {
    state.started = true;
  });

  const mockNow = vi.fn(() => 1.0);

  const mockTriggerAttack = vi.fn((note: string, time: number, velocity: number) => {
    state.activeAttacks.push({ note, time, velocity });
  });

  const mockTriggerRelease = vi.fn((note: string, time: number) => {
    state.activeReleases.push({ note, time });
  });

  const mockTriggerAttackRelease = vi.fn(
    (note: string, duration: string, time: number, velocity: number) => {
      state.ticks.push({ note, duration, time, velocity });
    },
  );

  let samplerOnloadCallback: (() => void) | undefined;

  class MockVolume {
    volume = {
      get value() {
        return state.volume;
      },
      set value(v: number) {
        state.volume = v;
      },
    };
    toDestination() {
      return this;
    }
    connect() {
      return this;
    }
  }

  class MockPolySynth {
    connect() {
      return this;
    }
    triggerAttack = mockTriggerAttack;
    triggerRelease = mockTriggerRelease;
    releaseAll = vi.fn();
  }

  class MockMembraneSynth {
    connect() {
      return this;
    }
    triggerAttackRelease = mockTriggerAttackRelease;
  }

  class MockSampler {
    constructor(config: { onload?: () => void }) {
      samplerOnloadCallback = config?.onload;
    }
    get loaded() {
      return true;
    }
    connect() {
      return this;
    }
    triggerAttack = mockTriggerAttack;
    triggerRelease = mockTriggerRelease;
    releaseAll = vi.fn();
  }

  class MockFreeverb {
    roomSize = { value: 0.65 };
    dampening = 2800;
    wet = { value: 0.2 };
    connect() {
      return this;
    }
  }

  class MockFilter {
    frequency = { rampTo: vi.fn(), value: 18000 };
    connect() {
      return this;
    }
  }

  class MockAnalyser {
    getValue() {
      return new Float32Array(32);
    }
  }

  const mockModule = {
    start: mockStart,
    now: mockNow,
    Frequency: vi.fn((m: number) => ({
      toNote: () => {
        const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const n = NOTE_NAMES[m % 12];
        const oct = Math.floor(m / 12) - 1;
        return `${n}${oct}`;
      },
    })),
    Volume: MockVolume,
    Freeverb: MockFreeverb,
    Filter: MockFilter,
    Analyser: MockAnalyser,
    Synth: class {},
    PolySynth: MockPolySynth,
    MembraneSynth: MockMembraneSynth,
    Sampler: MockSampler,
    getContext: vi.fn(() => ({
      rawContext: {
        createMediaStreamDestination: vi.fn(() => ({
          stream: { id: "mock-stream", getTracks: () => [] },
        })),
      },
    })),
  };

  const triggerSamplerLoaded = () => {
    state.samplerLoaded = true;
    if (samplerOnloadCallback) {
      samplerOnloadCallback();
    }
  };

  const resetState = () => {
    state.started = false;
    state.activeAttacks.length = 0;
    state.activeReleases.length = 0;
    state.ticks.length = 0;
    state.samplerLoaded = false;
    state.volume = 0;
  };

  return {
    mockModule,
    state,
    triggerSamplerLoaded,
    resetState,
    mockStart,
    mockNow,
    mockTriggerAttack,
    mockTriggerRelease,
    mockTriggerAttackRelease,
  };
}

export async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") {
    return new Uint8Array(await blob.arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

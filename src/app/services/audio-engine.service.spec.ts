import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AudioEngineService } from './audio-engine.service';
import { AudioStateService } from './audio-state.service';

// Minimal AudioContext mock — only the surface area used by AudioEngineService.
function makeMockCtx() {
  const source = {
    buffer: null as AudioBuffer | null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as ((ev: Event) => void) | null,
  };
  const gain = { connect: vi.fn(), disconnect: vi.fn() };
  const ctx = {
    currentTime: 0,
    state: 'running' as AudioContextState,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    decodeAudioData: vi.fn().mockResolvedValue({
      duration: 180,
      numberOfChannels: 2,
      sampleRate: 44100,
      length: 44100 * 180,
      getChannelData: vi.fn().mockReturnValue(new Float32Array(10)),
    } as unknown as AudioBuffer),
    createGain: vi.fn().mockReturnValue(gain),
    createBufferSource: vi.fn().mockReturnValue(source),
    _source: source,
  };
  return ctx;
}

vi.mock('@soundtouchjs/audio-worklet', () => {
  const SoundTouchNode = vi.fn().mockImplementation(() => ({
    tempo: { value: 1.0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  (SoundTouchNode as any).register = vi.fn().mockResolvedValue(undefined);
  return { SoundTouchNode };
});

describe('AudioEngineService', () => {
  let engine: AudioEngineService;
  let state: AudioStateService;
  let mockCtx: ReturnType<typeof makeMockCtx>;

  beforeEach(() => {
    mockCtx = makeMockCtx();
    vi.stubGlobal('AudioContext', vi.fn().mockReturnValue(mockCtx));

    TestBed.configureTestingModule({});
    state = TestBed.inject(AudioStateService);
    engine = TestBed.inject(AudioEngineService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  describe('stop()', () => {
    it('resets position to 0', () => {
      state.position.set(42);
      engine.stop();
      expect(state.position()).toBe(0);
    });

    it('sets isPlaying to false', () => {
      state.isPlaying.set(true);
      engine.stop();
      expect(state.isPlaying()).toBe(false);
    });
  });

  describe('seek()', () => {
    it('updates position when not playing', () => {
      state.duration.set(120);
      engine.seek(60);
      expect(state.position()).toBe(60);
    });

    it('clamps position to duration', () => {
      state.duration.set(120);
      engine.seek(999);
      expect(state.position()).toBe(120);
    });

    it('clamps position to zero', () => {
      state.duration.set(120);
      engine.seek(-10);
      expect(state.position()).toBe(0);
    });
  });

  describe('setSpeed()', () => {
    it('updates the speed signal when not playing', () => {
      engine.setSpeed(0.5);
      expect(state.speed()).toBe(0.5);
    });

    it('handles 2× speed', () => {
      engine.setSpeed(2.0);
      expect(state.speed()).toBe(2.0);
    });
  });

  describe('setLoopStart()', () => {
    it('sets loop start', () => {
      state.loopEnd.set(60);
      engine.setLoopStart(30);
      expect(state.loopStart()).toBe(30);
    });

    it('clamps to zero', () => {
      state.loopEnd.set(60);
      engine.setLoopStart(-5);
      expect(state.loopStart()).toBe(0);
    });

    it('clamps to loopEnd when value exceeds it', () => {
      state.loopEnd.set(60);
      engine.setLoopStart(90);
      expect(state.loopStart()).toBe(60);
    });
  });

  describe('setLoopEnd()', () => {
    it('sets loop end', () => {
      state.duration.set(120);
      state.loopStart.set(10);
      engine.setLoopEnd(80);
      expect(state.loopEnd()).toBe(80);
    });

    it('clamps to duration', () => {
      state.duration.set(120);
      engine.setLoopEnd(999);
      expect(state.loopEnd()).toBe(120);
    });

    it('clamps to loopStart when value is below it', () => {
      state.duration.set(120);
      state.loopStart.set(40);
      engine.setLoopEnd(10);
      expect(state.loopEnd()).toBe(40);
    });
  });

  describe('play()', () => {
    it('returns without error when no buffer is loaded', async () => {
      // buffer is null by default — play() should exit early
      await expect(engine.play()).resolves.toBeUndefined();
      expect(state.isPlaying()).toBe(false);
    });
  });
});

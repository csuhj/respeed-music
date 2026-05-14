import { render, screen } from '@testing-library/angular';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { PlayerComponent } from './player.component';
import { AudioStateService } from '../../services/audio-state.service';
import { AudioEngineService } from '../../services/audio-engine.service';

function makeStateStub() {
  return {
    fileName:    signal('track.mp3'),
    duration:    signal(120),
    position:    signal(0),
    isLoaded:    signal(true),
    isPlaying:   signal(false),
    speed:       signal(1.0),
    error:       signal<string | null>(null),
    audioBuffer: signal<AudioBuffer | null>(null),
    loopEnabled: signal(false),
    loopStart:   signal(0),
    loopEnd:     signal(120),
  };
}

function makeEngineStub() {
  return {
    play:         vi.fn().mockResolvedValue(undefined),
    pause:        vi.fn(),
    stop:         vi.fn(),
    seek:         vi.fn(),
    setSpeed:     vi.fn(),
    setLoopStart: vi.fn(),
    setLoopEnd:   vi.fn(),
    load:         vi.fn().mockResolvedValue(undefined),
  };
}

describe('PlayerComponent', () => {
  let stateStub: ReturnType<typeof makeStateStub>;
  let engineStub: ReturnType<typeof makeEngineStub>;

  beforeEach(() => {
    stateStub = makeStateStub();
    engineStub = makeEngineStub();

    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function setup() {
    return render(PlayerComponent, {
      providers: [
        { provide: AudioStateService,  useValue: stateStub },
        { provide: AudioEngineService, useValue: engineStub },
      ],
    });
  }

  it('creates successfully', async () => {
    const { fixture } = await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('computed ViewModels', () => {
    it('seek bar shows current position and duration', async () => {
      stateStub.position.set(45);
      stateStub.duration.set(180);
      await setup();
      expect(screen.getByText('0:45')).toBeTruthy();
      expect(screen.getByText('3:00')).toBeTruthy();
      const seekSlider = document.querySelector('app-seek-bar .slider') as HTMLInputElement;
      expect(seekSlider.disabled).toBe(false);
    });

    it('seek bar slider is disabled when not loaded', async () => {
      stateStub.isLoaded.set(false);
      await setup();
      const seekSlider = document.querySelector('app-seek-bar .slider') as HTMLInputElement;
      expect(seekSlider.disabled).toBe(true);
    });

    it('speed readout reflects current speed', async () => {
      stateStub.speed.set(0.5);
      await setup();
      expect(document.querySelector('.readout')?.textContent?.trim()).toBe('50%');
    });

    it('loop section reflects all loop state signals', async () => {
      stateStub.loopEnabled.set(true);
      stateStub.loopStart.set(10);
      stateStub.loopEnd.set(80);
      await setup();
      expect(screen.getByText('On')).toBeTruthy();
      expect(screen.getByText('A: 0:10')).toBeTruthy();
      expect(screen.getByText('B: 1:20')).toBeTruthy();
    });

    it('waveform shows empty state when audio buffer is null', async () => {
      stateStub.position.set(30);
      await setup();
      expect(document.querySelector('.empty-state')).toBeTruthy();
      const playhead = document.querySelector('.playhead') as HTMLElement;
      expect(playhead?.style.left).toBe('25%');
    });
  });

  describe('togglePlay()', () => {
    it('calls engine.play() when not playing', async () => {
      const { fixture } = await setup();
      fixture.componentInstance.togglePlay();
      expect(engineStub.play).toHaveBeenCalled();
    });

    it('calls engine.pause() when playing', async () => {
      stateStub.isPlaying.set(true);
      const { fixture } = await setup();
      fixture.componentInstance.togglePlay();
      expect(engineStub.pause).toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('delegates to engine.stop()', async () => {
      const { fixture } = await setup();
      fixture.componentInstance.stop();
      expect(engineStub.stop).toHaveBeenCalled();
    });
  });

  describe('output event handlers', () => {
    it('onSeek delegates to engine.seek()', async () => {
      const { fixture } = await setup();
      fixture.componentInstance.onSeek(42);
      expect(engineStub.seek).toHaveBeenCalledWith(42);
    });

    it('onSpeedChange delegates to engine.setSpeed()', async () => {
      const { fixture } = await setup();
      fixture.componentInstance.onSpeedChange(0.75);
      expect(engineStub.setSpeed).toHaveBeenCalledWith(0.75);
    });

    it('onLoopToggle flips state.loopEnabled', async () => {
      const { fixture } = await setup();
      fixture.componentInstance.onLoopToggle();
      expect(stateStub.loopEnabled()).toBe(true);
    });

    it('onLoopStartChange delegates to engine.setLoopStart()', async () => {
      const { fixture } = await setup();
      fixture.componentInstance.onLoopStartChange(15);
      expect(engineStub.setLoopStart).toHaveBeenCalledWith(15);
    });

    it('onLoopEndChange delegates to engine.setLoopEnd()', async () => {
      const { fixture } = await setup();
      fixture.componentInstance.onLoopEndChange(75);
      expect(engineStub.setLoopEnd).toHaveBeenCalledWith(75);
    });
  });
});

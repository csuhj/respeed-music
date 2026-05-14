import { render, screen } from '@testing-library/angular';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { App } from './app';
import { AudioStateService } from './services/audio-state.service';
import { AudioEngineService } from './services/audio-engine.service';

function makeStateStub() {
  return {
    fileName:    signal(''),
    duration:    signal(0),
    position:    signal(0),
    isLoaded:    signal(false),
    isPlaying:   signal(false),
    speed:       signal(1.0),
    error:       signal<string | null>(null),
    audioBuffer: signal<AudioBuffer | null>(null),
    loopEnabled: signal(false),
    loopStart:   signal(0),
    loopEnd:     signal(0),
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

describe('App', () => {
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
    return render(App, {
      providers: [
        { provide: AudioStateService,  useValue: stateStub },
        { provide: AudioEngineService, useValue: engineStub },
      ],
    });
  }

  it('should create the app', async () => {
    const { fixture } = await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render title', async () => {
    await setup();
    expect(screen.getByText('Respeed Music')).toBeTruthy();
  });

  describe('fileUploadVm', () => {
    it('reflects state.isLoaded, fileName, and duration in the upload zone', async () => {
      stateStub.isLoaded.set(true);
      stateStub.fileName.set('my-song.flac');
      stateStub.duration.set(240);
      await setup();
      expect(document.querySelector('.loaded-info')).toBeTruthy();
      expect(document.querySelector('.file-name')?.textContent?.trim()).toBe('my-song.flac');
      expect(document.querySelector('.file-duration')?.textContent?.trim()).toBe('4:00');
    });

    it('propagates error from state', async () => {
      stateStub.error.set('Unsupported format');
      await setup();
      expect(screen.getByText('Unsupported format')).toBeTruthy();
    });
  });

  describe('onFileSelected', () => {
    it('delegates to engine.load()', async () => {
      const { fixture } = await setup();
      const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
      fixture.componentInstance.onFileSelected(file);
      expect(engineStub.load).toHaveBeenCalledWith(file);
    });
  });

  describe('player visibility', () => {
    it('hides the player when audio is not loaded', async () => {
      await setup();
      expect(document.querySelector('app-player')).toBeFalsy();
    });

    it('shows the player when audio is loaded', async () => {
      stateStub.isLoaded.set(true);
      await setup();
      expect(document.querySelector('app-player')).toBeTruthy();
    });
  });
});

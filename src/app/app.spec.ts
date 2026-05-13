import { TestBed } from '@angular/core/testing';
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

  beforeEach(async () => {
    stateStub = makeStateStub();
    engineStub = makeEngineStub();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: AudioStateService,  useValue: stateStub },
        { provide: AudioEngineService, useValue: engineStub },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(h1?.textContent).toContain('Respeed Music');
  });

  describe('fileUploadVm', () => {
    it('reflects state.isLoaded', () => {
      stateStub.isLoaded.set(true);
      stateStub.fileName.set('my-song.flac');
      stateStub.duration.set(240);

      const fixture = TestBed.createComponent(App);
      const vm = fixture.componentInstance['fileUploadVm']();
      expect(vm.isLoaded).toBe(true);
      expect(vm.fileName).toBe('my-song.flac');
      expect(vm.duration).toBe(240);
    });

    it('propagates error from state', () => {
      stateStub.error.set('Unsupported format');
      const fixture = TestBed.createComponent(App);
      expect(fixture.componentInstance['fileUploadVm']().error).toBe('Unsupported format');
    });
  });

  describe('onFileSelected', () => {
    it('delegates to engine.load()', () => {
      const fixture = TestBed.createComponent(App);
      const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
      fixture.componentInstance.onFileSelected(file);
      expect(engineStub.load).toHaveBeenCalledWith(file);
    });
  });

  describe('player visibility', () => {
    it('hides the player when audio is not loaded', async () => {
      stateStub.isLoaded.set(false);
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-player')).toBeFalsy();
    });

    it('shows the player when audio is loaded', async () => {
      stateStub.isLoaded.set(true);
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-player')).toBeTruthy();
    });
  });
});

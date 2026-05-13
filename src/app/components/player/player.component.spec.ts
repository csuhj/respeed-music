import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    loopEnabled_update: (fn: (v: boolean) => boolean) => {},
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
  let fixture: ComponentFixture<PlayerComponent>;
  let component: PlayerComponent;
  let stateStub: ReturnType<typeof makeStateStub>;
  let engineStub: ReturnType<typeof makeEngineStub>;

  beforeEach(async () => {
    stateStub = makeStateStub();
    engineStub = makeEngineStub();

    await TestBed.configureTestingModule({
      imports: [PlayerComponent],
      providers: [
        { provide: AudioStateService,  useValue: stateStub },
        { provide: AudioEngineService, useValue: engineStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  describe('computed ViewModels', () => {
    it('seekBarVm reflects state signals', () => {
      stateStub.position.set(45);
      stateStub.duration.set(180);
      const vm = component['seekBarVm']();
      expect(vm.position).toBe(45);
      expect(vm.duration).toBe(180);
      expect(vm.disabled).toBe(false);
    });

    it('seekBarVm.disabled is true when not loaded', () => {
      stateStub.isLoaded.set(false);
      expect(component['seekBarVm']().disabled).toBe(true);
    });

    it('speedVm reflects current speed', () => {
      stateStub.speed.set(0.5);
      expect(component['speedVm']().speed).toBe(0.5);
    });

    it('loopVm reflects all loop state signals', () => {
      stateStub.loopEnabled.set(true);
      stateStub.loopStart.set(10);
      stateStub.loopEnd.set(80);
      const vm = component['loopVm']();
      expect(vm.loopEnabled).toBe(true);
      expect(vm.loopStart).toBe(10);
      expect(vm.loopEnd).toBe(80);
    });

    it('waveformVm includes audioBuffer and position', () => {
      stateStub.position.set(30);
      const vm = component['waveformVm']();
      expect(vm.position).toBe(30);
      expect(vm.audioBuffer).toBeNull();
    });
  });

  describe('togglePlay()', () => {
    it('calls engine.play() when not playing', () => {
      stateStub.isPlaying.set(false);
      component.togglePlay();
      expect(engineStub.play).toHaveBeenCalled();
    });

    it('calls engine.pause() when playing', () => {
      stateStub.isPlaying.set(true);
      component.togglePlay();
      expect(engineStub.pause).toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('delegates to engine.stop()', () => {
      component.stop();
      expect(engineStub.stop).toHaveBeenCalled();
    });
  });

  describe('output event handlers', () => {
    it('onSeek delegates to engine.seek()', () => {
      component.onSeek(42);
      expect(engineStub.seek).toHaveBeenCalledWith(42);
    });

    it('onSpeedChange delegates to engine.setSpeed()', () => {
      component.onSpeedChange(0.75);
      expect(engineStub.setSpeed).toHaveBeenCalledWith(0.75);
    });

    it('onLoopToggle flips state.loopEnabled', () => {
      stateStub.loopEnabled.set(false);
      component.onLoopToggle();
      expect(stateStub.loopEnabled()).toBe(true);
    });

    it('onLoopStartChange delegates to engine.setLoopStart()', () => {
      component.onLoopStartChange(15);
      expect(engineStub.setLoopStart).toHaveBeenCalledWith(15);
    });

    it('onLoopEndChange delegates to engine.setLoopEnd()', () => {
      component.onLoopEndChange(75);
      expect(engineStub.setLoopEnd).toHaveBeenCalledWith(75);
    });
  });
});

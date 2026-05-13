import { AudioStateService } from './audio-state.service';

describe('AudioStateService', () => {
  let service: AudioStateService;

  beforeEach(() => {
    service = new AudioStateService();
  });

  describe('default values', () => {
    it('starts unloaded with empty metadata', () => {
      expect(service.isLoaded()).toBe(false);
      expect(service.fileName()).toBe('');
      expect(service.duration()).toBe(0);
      expect(service.position()).toBe(0);
    });

    it('starts not playing', () => {
      expect(service.isPlaying()).toBe(false);
    });

    it('starts at normal speed with no error', () => {
      expect(service.speed()).toBe(1.0);
      expect(service.error()).toBeNull();
      expect(service.audioBuffer()).toBeNull();
    });

    it('starts with loop disabled and zeroed points', () => {
      expect(service.loopEnabled()).toBe(false);
      expect(service.loopStart()).toBe(0);
      expect(service.loopEnd()).toBe(0);
    });
  });

  describe('signal mutations', () => {
    it('fileName can be set and read back', () => {
      service.fileName.set('my-track.mp3');
      expect(service.fileName()).toBe('my-track.mp3');
    });

    it('isPlaying can be toggled', () => {
      service.isPlaying.set(true);
      expect(service.isPlaying()).toBe(true);
      service.isPlaying.set(false);
      expect(service.isPlaying()).toBe(false);
    });

    it('speed reflects assigned value', () => {
      service.speed.set(0.75);
      expect(service.speed()).toBe(0.75);
    });

    it('error can hold a message and be cleared', () => {
      service.error.set('Could not decode file');
      expect(service.error()).toBe('Could not decode file');
      service.error.set(null);
      expect(service.error()).toBeNull();
    });

    it('loopEnabled can be toggled with update()', () => {
      service.loopEnabled.update(v => !v);
      expect(service.loopEnabled()).toBe(true);
      service.loopEnabled.update(v => !v);
      expect(service.loopEnabled()).toBe(false);
    });

    it('loop points can be set independently', () => {
      service.loopStart.set(10);
      service.loopEnd.set(45);
      expect(service.loopStart()).toBe(10);
      expect(service.loopEnd()).toBe(45);
    });
  });
});

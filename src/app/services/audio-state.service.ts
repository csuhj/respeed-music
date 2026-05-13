import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioStateService {
  readonly fileName    = signal('');
  readonly duration    = signal(0);
  readonly position    = signal(0);
  readonly isLoaded    = signal(false);
  readonly isPlaying   = signal(false);
  readonly speed       = signal(1.0);
  readonly error       = signal<string | null>(null);
  readonly audioBuffer = signal<AudioBuffer | null>(null);
  readonly loopEnabled = signal(false);
  readonly loopStart   = signal(0);
  readonly loopEnd     = signal(0);
}

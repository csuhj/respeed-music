import { Injectable, signal } from '@angular/core';
import { SoundTouchNode } from '@soundtouchjs/audio-worklet';

@Injectable({ providedIn: 'root' })
export class AudioService {
  readonly fileName = signal('');
  readonly duration = signal(0);
  readonly position = signal(0);
  readonly isLoaded = signal(false);
  readonly isPlaying = signal(false);
  readonly speed = signal(1.0);
  readonly error = signal<string | null>(null);
  readonly audioBuffer = signal<AudioBuffer | null>(null);

  readonly loopEnabled = signal(false);
  readonly loopStart = signal(0);
  readonly loopEnd = signal(0);

  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private stNode: SoundTouchNode | null = null;
  private gainNode: GainNode | null = null;

  private startContextTime = 0;
  private seekOffset = 0;
  private workletRegistered = false;
  private positionTimer: ReturnType<typeof setInterval> | null = null;
  private loopRestarting = false;

  async load(file: File): Promise<void> {
    this.stop();
    this.error.set(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Decode using a throwaway context so the playback AudioContext is
      // always created inside the play() user-gesture on iOS Safari.
      const decodeCtx = new AudioContext();
      this.buffer = await decodeCtx.decodeAudioData(arrayBuffer);
      decodeCtx.close();
      // Discard any existing playback context — play() will create a fresh
      // one from within the button-tap gesture, which iOS requires.
      if (this.ctx) {
        this.ctx.close();
        this.ctx = null;
        this.workletRegistered = false;
      }
      this.audioBuffer.set(this.buffer);
      this.duration.set(this.buffer.duration);
      this.seekOffset = 0;
      this.position.set(0);
      this.loopStart.set(0);
      this.loopEnd.set(this.buffer.duration);
      this.loopEnabled.set(false);
      this.fileName.set(file.name);
      this.isLoaded.set(true);
    } catch {
      this.error.set('Could not decode audio — try MP3, WAV, FLAC, or OGG.');
      this.isLoaded.set(false);
    }
  }

  async play(): Promise<void> {
    if (!this.buffer) return;
    const ctx = this.getCtx();

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (!this.workletRegistered) {
      await SoundTouchNode.register(ctx, 'assets/soundtouch-processor.js');
      this.workletRegistered = true;
    }

    this.teardownGraph();

    this.stNode = new SoundTouchNode(ctx);
    this.stNode.tempo.value = this.speed();

    this.gainNode = ctx.createGain();
    this.stNode.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    this.source = ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.stNode);
    this.source.onended = () => {
      if (this.isPlaying() && !this.loopRestarting) {
        this.isPlaying.set(false);
        this.position.set(this.duration());
        this.stopTimer();
      }
    };

    this.startContextTime = ctx.currentTime;
    this.source.start(0, this.seekOffset);
    this.isPlaying.set(true);
    this.loopRestarting = false;
    this.startTimer();
  }

  pause(): void {
    if (!this.isPlaying()) return;
    this.seekOffset = this.currentPosition();
    this.position.set(this.seekOffset);
    this.teardownGraph();
    this.isPlaying.set(false);
    this.stopTimer();
  }

  stop(): void {
    this.teardownGraph();
    this.seekOffset = 0;
    this.position.set(0);
    this.isPlaying.set(false);
    this.stopTimer();
  }

  seek(seconds: number): void {
    const clamped = Math.max(0, Math.min(seconds, this.duration()));
    this.seekOffset = clamped;
    this.position.set(clamped);
    if (this.isPlaying()) {
      this.teardownGraph();
      this.play();
    }
  }

  setSpeed(ratio: number): void {
    if (this.isPlaying()) {
      // Snapshot position so tracking stays accurate after speed change
      this.seekOffset = this.currentPosition();
      this.startContextTime = this.getCtx().currentTime;
    }
    this.speed.set(ratio);
    if (this.stNode) {
      this.stNode.tempo.value = ratio;
    }
  }

  setLoopStart(seconds: number): void {
    this.loopStart.set(Math.max(0, Math.min(seconds, this.loopEnd())));
  }

  setLoopEnd(seconds: number): void {
    this.loopEnd.set(Math.max(this.loopStart(), Math.min(seconds, this.duration())));
  }

  private currentPosition(): number {
    if (!this.ctx || !this.isPlaying()) return this.seekOffset;
    const elapsed = this.ctx.currentTime - this.startContextTime;
    return Math.min(this.seekOffset + elapsed * this.speed(), this.duration());
  }

  private startTimer(): void {
    this.stopTimer();
    this.positionTimer = setInterval(() => {
      const pos = this.currentPosition();
      this.position.set(pos);

      if (this.loopEnabled() && pos >= this.loopEnd() && !this.loopRestarting) {
        this.loopRestarting = true;
        this.seekOffset = this.loopStart();
        this.teardownGraph();
        this.play();
        return;
      }

      if (pos >= this.duration()) {
        this.isPlaying.set(false);
        this.position.set(this.duration());
        this.stopTimer();
      }
    }, 250);
  }

  private stopTimer(): void {
    if (this.positionTimer !== null) {
      clearInterval(this.positionTimer);
      this.positionTimer = null;
    }
  }

  private teardownGraph(): void {
    if (this.source) {
      this.source.onended = null;
      try { this.source.stop(); } catch { /* already stopped */ }
      this.source.disconnect();
      this.source = null;
    }
    if (this.stNode) {
      this.stNode.disconnect();
      this.stNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }
}

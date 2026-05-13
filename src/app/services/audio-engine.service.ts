import { Injectable, inject } from '@angular/core';
import { SoundTouchNode } from '@soundtouchjs/audio-worklet';
import { AudioStateService } from './audio-state.service';

@Injectable({ providedIn: 'root' })
export class AudioEngineService {
  private readonly state = inject(AudioStateService);

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
    this.state.error.set(null);
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
      this.state.audioBuffer.set(this.buffer);
      this.state.duration.set(this.buffer.duration);
      this.seekOffset = 0;
      this.state.position.set(0);
      this.state.loopStart.set(0);
      this.state.loopEnd.set(this.buffer.duration);
      this.state.loopEnabled.set(false);
      this.state.fileName.set(file.name);
      this.state.isLoaded.set(true);
    } catch {
      this.state.error.set('Could not decode audio — try MP3, WAV, FLAC, or OGG.');
      this.state.isLoaded.set(false);
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
    this.stNode.tempo.value = this.state.speed();

    this.gainNode = ctx.createGain();
    this.stNode.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    this.source = ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.stNode);
    this.source.onended = () => {
      if (this.state.isPlaying() && !this.loopRestarting) {
        this.state.isPlaying.set(false);
        this.state.position.set(this.state.duration());
        this.stopTimer();
      }
    };

    this.startContextTime = ctx.currentTime;
    this.source.start(0, this.seekOffset);
    this.state.isPlaying.set(true);
    this.loopRestarting = false;
    this.startTimer();
  }

  pause(): void {
    if (!this.state.isPlaying()) return;
    this.seekOffset = this.currentPosition();
    this.state.position.set(this.seekOffset);
    this.teardownGraph();
    this.state.isPlaying.set(false);
    this.stopTimer();
  }

  stop(): void {
    this.teardownGraph();
    this.seekOffset = 0;
    this.state.position.set(0);
    this.state.isPlaying.set(false);
    this.stopTimer();
  }

  seek(seconds: number): void {
    const clamped = Math.max(0, Math.min(seconds, this.state.duration()));
    this.seekOffset = clamped;
    this.state.position.set(clamped);
    if (this.state.isPlaying()) {
      this.teardownGraph();
      this.play();
    }
  }

  setSpeed(ratio: number): void {
    if (this.state.isPlaying()) {
      // Capture position before changing speed; currentPosition() uses the current ratio
      this.seekOffset = this.currentPosition();
    }
    this.state.speed.set(ratio);
    if (this.state.isPlaying()) {
      // Restart playback to flush SoundTouch's internal buffer; simply updating
      // tempo.value leaves already-buffered slow audio draining at the old speed
      this.teardownGraph();
      this.play();
    }
  }

  setLoopStart(seconds: number): void {
    this.state.loopStart.set(Math.max(0, Math.min(seconds, this.state.loopEnd())));
  }

  setLoopEnd(seconds: number): void {
    this.state.loopEnd.set(Math.max(this.state.loopStart(), Math.min(seconds, this.state.duration())));
  }

  private currentPosition(): number {
    if (!this.ctx || !this.state.isPlaying()) return this.seekOffset;
    const elapsed = this.ctx.currentTime - this.startContextTime;
    return Math.min(this.seekOffset + elapsed * this.state.speed(), this.state.duration());
  }

  private startTimer(): void {
    this.stopTimer();
    this.positionTimer = setInterval(() => {
      const pos = this.currentPosition();
      this.state.position.set(pos);

      if (this.state.loopEnabled() && pos >= this.state.loopEnd() && !this.loopRestarting) {
        this.loopRestarting = true;
        this.seekOffset = this.state.loopStart();
        this.teardownGraph();
        this.play();
        return;
      }

      if (pos >= this.state.duration()) {
        this.state.isPlaying.set(false);
        this.state.position.set(this.state.duration());
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

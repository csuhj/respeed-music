import { Component, computed, inject } from '@angular/core';
import { AudioStateService } from '../../services/audio-state.service';
import { AudioEngineService } from '../../services/audio-engine.service';
import { SeekBarComponent } from '../seek-bar/seek-bar.component';
import { SpeedControlComponent } from '../speed-control/speed-control.component';
import { LoopRegionComponent } from '../loop-region/loop-region.component';
import { WaveformComponent } from '../waveform/waveform.component';
import { LoopRegionVm, SeekBarVm, SpeedControlVm, WaveformVm } from '../../models/view-models';

@Component({
  selector: 'app-player',
  imports: [SeekBarComponent, SpeedControlComponent, LoopRegionComponent, WaveformComponent],
  templateUrl: './player.component.html',
  styleUrl: './player.component.scss',
})
export class PlayerComponent {
  protected readonly state = inject(AudioStateService);
  private readonly engine = inject(AudioEngineService);

  protected readonly seekBarVm = computed<SeekBarVm>(() => ({
    position: this.state.position(),
    duration: this.state.duration(),
    disabled: !this.state.isLoaded(),
  }));

  protected readonly speedVm = computed<SpeedControlVm>(() => ({
    speed:    this.state.speed(),
    disabled: !this.state.isLoaded(),
  }));

  protected readonly loopVm = computed<LoopRegionVm>(() => ({
    loopEnabled: this.state.loopEnabled(),
    loopStart:   this.state.loopStart(),
    loopEnd:     this.state.loopEnd(),
    duration:    this.state.duration(),
  }));

  protected readonly waveformVm = computed<WaveformVm>(() => ({
    audioBuffer: this.state.audioBuffer(),
    position:    this.state.position(),
    duration:    this.state.duration(),
    loopStart:   this.state.loopStart(),
    loopEnd:     this.state.loopEnd(),
    loopEnabled: this.state.loopEnabled(),
  }));

  togglePlay(): void {
    if (this.state.isPlaying()) {
      this.engine.pause();
    } else {
      this.engine.play().catch(err => console.error('Audio playback failed:', err));
    }
  }

  stop(): void {
    this.engine.stop();
  }

  onSeek(seconds: number): void            { this.engine.seek(seconds); }
  onSpeedChange(ratio: number): void       { this.engine.setSpeed(ratio); }
  onLoopToggle(): void                     { this.state.loopEnabled.update(v => !v); }
  onLoopStartChange(seconds: number): void { this.engine.setLoopStart(seconds); }
  onLoopEndChange(seconds: number): void   { this.engine.setLoopEnd(seconds); }
}

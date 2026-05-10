import { Component, inject } from '@angular/core';
import { AudioService } from '../../services/audio.service';
import { SeekBarComponent } from '../seek-bar/seek-bar.component';
import { SpeedControlComponent } from '../speed-control/speed-control.component';
import { LoopRegionComponent } from '../loop-region/loop-region.component';
import { WaveformComponent } from '../waveform/waveform.component';

@Component({
  selector: 'app-player',
  imports: [SeekBarComponent, SpeedControlComponent, LoopRegionComponent, WaveformComponent],
  templateUrl: './player.component.html',
  styleUrl: './player.component.scss',
})
export class PlayerComponent {
  protected readonly audio = inject(AudioService);

  togglePlay(): void {
    if (this.audio.isPlaying()) {
      this.audio.pause();
    } else {
      this.audio.play().catch(err => console.error('Audio playback failed:', err));
    }
  }

  stop(): void {
    this.audio.stop();
  }
}

import { Component, inject } from '@angular/core';
import { AudioService } from '../../services/audio.service';

const PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5] as const;

@Component({
  selector: 'app-speed-control',
  templateUrl: './speed-control.component.html',
  styleUrl: './speed-control.component.scss',
})
export class SpeedControlComponent {
  protected readonly audio = inject(AudioService);
  protected readonly presets = PRESETS;

  presetLabel(ratio: number): string {
    return `${ratio * 100}%`;
  }

  get speedPercent(): number {
    return Math.round(this.audio.speed() * 100);
  }

  onSliderInput(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    this.audio.setSpeed(raw / 100);
  }

  setPreset(ratio: number): void {
    this.audio.setSpeed(ratio);
  }
}

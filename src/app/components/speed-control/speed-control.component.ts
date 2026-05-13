import { Component, input, output } from '@angular/core';
import { SpeedControlVm } from '../../models/view-models';

const PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5] as const;

@Component({
  selector: 'app-speed-control',
  templateUrl: './speed-control.component.html',
  styleUrl: './speed-control.component.scss',
})
export class SpeedControlComponent {
  readonly vm = input.required<SpeedControlVm>();
  readonly speedChange = output<number>();

  protected readonly presets = PRESETS;

  presetLabel(ratio: number): string {
    return `${ratio * 100}%`;
  }

  get speedPercent(): number {
    return Math.round(this.vm().speed * 100);
  }

  onSliderInput(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    this.speedChange.emit(raw / 100);
  }

  setPreset(ratio: number): void {
    this.speedChange.emit(ratio);
  }
}

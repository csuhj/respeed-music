import { Component, input, output } from '@angular/core';
import { SeekBarVm } from '../../models/view-models';
import { formatDuration } from '../../utils/format-duration';

@Component({
  selector: 'app-seek-bar',
  templateUrl: './seek-bar.component.html',
  styleUrl: './seek-bar.component.scss',
})
export class SeekBarComponent {
  readonly vm = input.required<SeekBarVm>();
  readonly seek = output<number>();

  protected readonly formatDuration = formatDuration;

  protected isDragging = false;
  protected dragValue = 0;

  get displayValue(): number {
    return this.isDragging ? this.dragValue : this.vm().position;
  }

  get progressPct(): number {
    const dur = this.vm().duration;
    return dur > 0 ? (this.displayValue / dur) * 100 : 0;
  }

  onInput(event: Event): void {
    this.isDragging = true;
    this.dragValue = Number((event.target as HTMLInputElement).value);
  }

  onCommit(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.isDragging = false;
    this.seek.emit(value);
  }
}

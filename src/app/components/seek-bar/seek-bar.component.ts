import { Component, inject } from '@angular/core';
import { AudioService } from '../../services/audio.service';
import { formatDuration } from '../../utils/format-duration';

@Component({
  selector: 'app-seek-bar',
  templateUrl: './seek-bar.component.html',
  styleUrl: './seek-bar.component.scss',
})
export class SeekBarComponent {
  protected readonly audio = inject(AudioService);
  protected readonly formatDuration = formatDuration;

  protected isDragging = false;
  protected dragValue = 0;

  get displayValue(): number {
    return this.isDragging ? this.dragValue : this.audio.position();
  }

  get progressPct(): number {
    const dur = this.audio.duration();
    return dur > 0 ? (this.displayValue / dur) * 100 : 0;
  }

  onInput(event: Event): void {
    this.isDragging = true;
    this.dragValue = Number((event.target as HTMLInputElement).value);
  }

  onCommit(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.isDragging = false;
    this.audio.seek(value);
  }
}

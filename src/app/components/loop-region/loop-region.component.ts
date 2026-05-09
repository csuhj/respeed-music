import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { AudioService } from '../../services/audio.service';
import { formatDuration } from '../../utils/format-duration';

type Handle = 'start' | 'end';

const MIN_LOOP_SPAN = 0.5; // seconds

@Component({
  selector: 'app-loop-region',
  templateUrl: './loop-region.component.html',
  styleUrl: './loop-region.component.scss',
})
export class LoopRegionComponent {
  protected readonly audio = inject(AudioService);
  protected readonly formatDuration = formatDuration;

  @ViewChild('track') trackRef!: ElementRef<HTMLDivElement>;

  private dragging: Handle | null = null;

  get startPct(): number {
    return this.toPct(this.audio.loopStart());
  }

  get endPct(): number {
    return this.toPct(this.audio.loopEnd());
  }

  get fillLeft(): string {
    return `${this.startPct}%`;
  }

  get fillWidth(): string {
    return `${this.endPct - this.startPct}%`;
  }

  toggleLoop(): void {
    this.audio.loopEnabled.set(!this.audio.loopEnabled());
  }

  onHandlePointerDown(event: PointerEvent, handle: Handle): void {
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.dragging = handle;
  }

  onHandlePointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const time = this.pointerToTime(event.clientX);

    if (this.dragging === 'start') {
      this.audio.setLoopStart(Math.min(time, this.audio.loopEnd() - MIN_LOOP_SPAN));
    } else {
      this.audio.setLoopEnd(Math.max(time, this.audio.loopStart() + MIN_LOOP_SPAN));
    }
  }

  onHandlePointerUp(event: PointerEvent): void {
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    this.dragging = null;
  }

  private pointerToTime(clientX: number): number {
    const rect = this.trackRef.nativeElement.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * this.audio.duration();
  }

  private toPct(time: number): number {
    const dur = this.audio.duration();
    return dur > 0 ? (time / dur) * 100 : 0;
  }
}

import { Component, ElementRef, ViewChild, input, output } from '@angular/core';
import { LoopRegionVm } from '../../models/view-models';
import { formatDuration } from '../../utils/format-duration';

type Handle = 'start' | 'end';

const MIN_LOOP_SPAN = 0.5; // seconds

@Component({
  selector: 'app-loop-region',
  templateUrl: './loop-region.component.html',
  styleUrl: './loop-region.component.scss',
})
export class LoopRegionComponent {
  readonly vm = input.required<LoopRegionVm>();
  readonly loopToggle = output<void>();
  readonly loopStartChange = output<number>();
  readonly loopEndChange = output<number>();

  protected readonly formatDuration = formatDuration;

  @ViewChild('track') trackRef!: ElementRef<HTMLDivElement>;

  private dragging: Handle | null = null;

  get startPct(): number {
    return this.toPct(this.vm().loopStart);
  }

  get endPct(): number {
    return this.toPct(this.vm().loopEnd);
  }

  get fillLeft(): string {
    return `${this.startPct}%`;
  }

  get fillWidth(): string {
    return `${this.endPct - this.startPct}%`;
  }

  toggleLoop(): void {
    this.loopToggle.emit();
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
      this.loopStartChange.emit(Math.min(time, this.vm().loopEnd - MIN_LOOP_SPAN));
    } else {
      this.loopEndChange.emit(Math.max(time, this.vm().loopStart + MIN_LOOP_SPAN));
    }
  }

  onHandlePointerUp(event: PointerEvent): void {
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    this.dragging = null;
  }

  private pointerToTime(clientX: number): number {
    const rect = this.trackRef.nativeElement.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * this.vm().duration;
  }

  private toPct(time: number): number {
    const dur = this.vm().duration;
    return dur > 0 ? (time / dur) * 100 : 0;
  }
}

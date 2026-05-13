import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  ViewChild,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { WaveformVm } from '../../models/view-models';

@Component({
  selector: 'app-waveform',
  templateUrl: './waveform.component.html',
  styleUrl: './waveform.component.scss',
})
export class WaveformComponent implements OnDestroy {
  readonly vm = input.required<WaveformVm>();
  readonly seek = output<number>();

  private readonly injector = inject(Injector);

  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wrap') private wrapRef!: ElementRef<HTMLDivElement>;

  private resizeObserver!: ResizeObserver;

  // Isolated computed so the redraw effect only fires when the buffer
  // actually changes, not on every position/loop update from the vm.
  protected readonly buffer = computed(() => this.vm().audioBuffer);

  get positionPct(): number {
    const dur = this.vm().duration;
    return dur > 0 ? (this.vm().position / dur) * 100 : 0;
  }

  get loopStartPct(): number {
    const dur = this.vm().duration;
    return dur > 0 ? (this.vm().loopStart / dur) * 100 : 0;
  }

  get loopWidthPct(): number {
    const dur = this.vm().duration;
    return dur > 0 ? ((this.vm().loopEnd - this.vm().loopStart) / dur) * 100 : 100;
  }

  constructor() {
    afterNextRender(() => {
      this.resizeObserver = new ResizeObserver(() => {
        const buf = this.buffer();
        if (buf) this.draw(buf);
      });
      this.resizeObserver.observe(this.wrapRef.nativeElement);

      effect(() => {
        const buf = this.buffer();
        if (buf) this.draw(buf);
      }, { injector: this.injector });
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onWrapClick(event: MouseEvent): void {
    if (!this.buffer()) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    this.seek.emit(ratio * this.vm().duration);
  }

  private draw(buffer: AudioBuffer): void {
    const canvas = this.canvasRef.nativeElement;
    const wrap = this.wrapRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;

    canvas.width = W * dpr;
    canvas.height = H * dpr;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const data = buffer.getChannelData(0);
    const step = data.length / W;

    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-color').trim() || '#7c6af7';

    for (let x = 0; x < W; x++) {
      const start = Math.floor(x * step);
      const end = Math.min(Math.floor((x + 1) * step), data.length);
      let min = 1, max = -1;
      for (let i = start; i < end; i++) {
        const s = data[i];
        if (s < min) min = s;
        if (s > max) max = s;
      }
      const yTop = ((1 - max) / 2) * H;
      const yBot = ((1 - min) / 2) * H;
      ctx.fillRect(x, yTop, 1, Math.max(1, yBot - yTop));
    }
  }
}

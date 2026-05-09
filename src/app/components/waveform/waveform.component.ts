import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  ViewChild,
  afterNextRender,
  effect,
  inject,
} from '@angular/core';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-waveform',
  templateUrl: './waveform.component.html',
  styleUrl: './waveform.component.scss',
})
export class WaveformComponent implements OnDestroy {
  protected readonly audio = inject(AudioService);
  private readonly injector = inject(Injector);

  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wrap') private wrapRef!: ElementRef<HTMLDivElement>;

  private resizeObserver!: ResizeObserver;

  get positionPct(): number {
    const dur = this.audio.duration();
    return dur > 0 ? (this.audio.position() / dur) * 100 : 0;
  }

  get loopStartPct(): number {
    const dur = this.audio.duration();
    return dur > 0 ? (this.audio.loopStart() / dur) * 100 : 0;
  }

  get loopWidthPct(): number {
    const dur = this.audio.duration();
    return dur > 0 ? ((this.audio.loopEnd() - this.audio.loopStart()) / dur) * 100 : 100;
  }

  constructor() {
    afterNextRender(() => {
      this.resizeObserver = new ResizeObserver(() => {
        const buf = this.audio.audioBuffer();
        if (buf) this.draw(buf);
      });
      this.resizeObserver.observe(this.wrapRef.nativeElement);

      // React to buffer changes now that the view is ready
      effect(() => {
        const buf = this.audio.audioBuffer();
        if (buf) this.draw(buf);
      }, { injector: this.injector });
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onWrapClick(event: MouseEvent): void {
    if (!this.audio.isLoaded()) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    this.audio.seek(ratio * this.audio.duration());
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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WaveformComponent } from './waveform.component';
import { WaveformVm } from '../../models/view-models';

function makeBuffer(): AudioBuffer {
  return {
    duration: 120,
    numberOfChannels: 1,
    sampleRate: 44100,
    length: 44100 * 120,
    getChannelData: vi.fn().mockReturnValue(new Float32Array(100)),
  } as unknown as AudioBuffer;
}

const NULL_VM: WaveformVm = {
  audioBuffer: null,
  position: 0,
  duration: 0,
  loopStart: 0,
  loopEnd: 0,
  loopEnabled: false,
};

describe('WaveformComponent', () => {
  let fixture: ComponentFixture<WaveformComponent>;
  let component: WaveformComponent;

  beforeEach(async () => {
    // ResizeObserver is not available in jsdom
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });

    // jsdom's canvas.getContext('2d') returns null; provide a minimal stub so
    // the draw() method doesn't throw when an effect fires after buffer is set.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D);

    await TestBed.configureTestingModule({
      imports: [WaveformComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WaveformComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('vm', NULL_VM);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  describe('empty state', () => {
    it('shows empty state message when buffer is null', () => {
      const el = fixture.nativeElement.querySelector('.empty-state') as HTMLElement;
      expect(el).toBeTruthy();
      expect(el.textContent).toContain('Load a file');
    });

    it('hides playhead overlay when duration is 0', () => {
      expect(fixture.nativeElement.querySelector('.playhead')).toBeFalsy();
    });
  });

  describe('with buffer loaded', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('vm', {
        ...NULL_VM,
        audioBuffer: makeBuffer(),
        duration: 120,
        loopEnd: 120,
      });
      fixture.detectChanges();
    });

    it('hides the empty state message', () => {
      expect(fixture.nativeElement.querySelector('.empty-state')).toBeFalsy();
    });

    it('renders the playhead', () => {
      expect(fixture.nativeElement.querySelector('.playhead')).toBeTruthy();
    });

    it('applies .clickable class to the wrapper', () => {
      const wrap = fixture.nativeElement.querySelector('.waveform-wrap') as HTMLElement;
      expect(wrap.classList.contains('clickable')).toBe(true);
    });
  });

  describe('percentage calculations', () => {
    it('computes positionPct as 0 when duration is 0', () => {
      expect(component.positionPct).toBe(0);
    });

    it('computes positionPct correctly', () => {
      fixture.componentRef.setInput('vm', { ...NULL_VM, position: 30, duration: 120 });
      expect(component.positionPct).toBe(25);
    });
  });

  describe('seek output', () => {
    it('emits seek when the waveform is clicked with a buffer loaded', () => {
      const emitted: number[] = [];
      component.seek.subscribe(v => emitted.push(v));

      fixture.componentRef.setInput('vm', {
        ...NULL_VM,
        audioBuffer: makeBuffer(),
        duration: 120,
      });
      fixture.detectChanges();

      const wrap = fixture.nativeElement.querySelector('.waveform-wrap') as HTMLElement;
      vi.spyOn(wrap, 'getBoundingClientRect').mockReturnValue(
        { left: 0, width: 120, top: 0, bottom: 0, right: 120, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
      );
      wrap.dispatchEvent(new MouseEvent('click', { clientX: 60, bubbles: true }));

      // clientX=60 in a 120px-wide track mapped over 120s → 60s
      expect(emitted).toEqual([60]);
    });

    it('does not emit seek when there is no buffer', () => {
      const emitted: number[] = [];
      component.seek.subscribe(v => emitted.push(v));

      const wrap = fixture.nativeElement.querySelector('.waveform-wrap') as HTMLElement;
      wrap.dispatchEvent(new MouseEvent('click', { clientX: 60, bubbles: true }));

      expect(emitted).toEqual([]);
    });
  });
});

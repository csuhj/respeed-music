import { render, fireEvent } from '@testing-library/angular';
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

async function setup(vmOverrides?: Partial<WaveformVm>) {
  return render(WaveformComponent, {
    inputs: { vm: { ...NULL_VM, ...vmOverrides } },
  });
}

describe('WaveformComponent', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates successfully', async () => {
    const { fixture } = await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('empty state', () => {
    it('shows empty state message when buffer is null', async () => {
      await setup();
      const el = document.querySelector('.empty-state') as HTMLElement;
      expect(el).toBeTruthy();
      expect(el.textContent).toContain('Load a file');
    });

    it('hides playhead overlay when duration is 0', async () => {
      await setup();
      expect(document.querySelector('.playhead')).toBeFalsy();
    });
  });

  describe('with buffer loaded', () => {
    it('hides the empty state message', async () => {
      await setup({ audioBuffer: makeBuffer(), duration: 120, loopEnd: 120 });
      expect(document.querySelector('.empty-state')).toBeFalsy();
    });

    it('renders the playhead', async () => {
      await setup({ audioBuffer: makeBuffer(), duration: 120, loopEnd: 120 });
      expect(document.querySelector('.playhead')).toBeTruthy();
    });

    it('applies .clickable class to the wrapper', async () => {
      await setup({ audioBuffer: makeBuffer(), duration: 120, loopEnd: 120 });
      const wrap = document.querySelector('.waveform-wrap') as HTMLElement;
      expect(wrap.classList.contains('clickable')).toBe(true);
    });
  });

  describe('percentage calculations', () => {
    it('shows playhead at left 0% when position is 0', async () => {
      await setup({ position: 0, duration: 120 });
      const playhead = document.querySelector('.playhead') as HTMLElement;
      expect(playhead.style.left).toBe('0%');
    });

    it('positions playhead at 25% left when position is 30 of 120', async () => {
      await setup({ position: 30, duration: 120 });
      const playhead = document.querySelector('.playhead') as HTMLElement;
      expect(playhead.style.left).toBe('25%');
    });
  });

  describe('seek output', () => {
    it('emits seek when the waveform is clicked with a buffer loaded', async () => {
      const seekSpy = vi.fn();
      await render(WaveformComponent, {
        inputs: { vm: { ...NULL_VM, audioBuffer: makeBuffer(), duration: 120 } },
        on: { seek: seekSpy },
      });

      const wrap = document.querySelector('.waveform-wrap') as HTMLElement;
      vi.spyOn(wrap, 'getBoundingClientRect').mockReturnValue(
        { left: 0, width: 120, top: 0, bottom: 0, right: 120, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
      );
      fireEvent.click(wrap, { clientX: 60 });

      // clientX=60 in a 120px-wide track mapped over 120s → 60s
      expect(seekSpy).toHaveBeenCalledWith(60);
    });

    it('does not emit seek when there is no buffer', async () => {
      const seekSpy = vi.fn();
      await render(WaveformComponent, {
        inputs: { vm: NULL_VM },
        on: { seek: seekSpy },
      });

      const wrap = document.querySelector('.waveform-wrap') as HTMLElement;
      fireEvent.click(wrap, { clientX: 60 });

      expect(seekSpy).not.toHaveBeenCalled();
    });
  });
});

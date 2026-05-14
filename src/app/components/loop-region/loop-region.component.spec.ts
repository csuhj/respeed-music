import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { LoopRegionComponent } from './loop-region.component';
import { LoopRegionVm } from '../../models/view-models';

const DEFAULT_VM: LoopRegionVm = {
  loopEnabled: false,
  loopStart: 30,
  loopEnd: 90,
  duration: 120,
};

async function setup(vm: LoopRegionVm = DEFAULT_VM) {
  return render(LoopRegionComponent, { inputs: { vm } });
}

describe('LoopRegionComponent', () => {
  it('creates successfully', async () => {
    const { fixture } = await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('percentage calculations', () => {
    it('computes startPct from loopStart / duration', async () => {
      const { fixture } = await setup();
      // loopStart=30, duration=120 → 25%
      expect(fixture.componentInstance.startPct).toBe(25);
    });

    it('computes endPct from loopEnd / duration', async () => {
      const { fixture } = await setup();
      // loopEnd=90, duration=120 → 75%
      expect(fixture.componentInstance.endPct).toBe(75);
    });

    it('returns 0 for startPct when duration is 0', async () => {
      const { fixture } = await setup({ ...DEFAULT_VM, duration: 0 });
      expect(fixture.componentInstance.startPct).toBe(0);
    });

    it('fillWidth reflects the span between handles', async () => {
      const { fixture } = await setup();
      // endPct - startPct = 75 - 25 = 50%
      expect(fixture.componentInstance.fillWidth).toBe('50%');
    });
  });

  describe('toggleLoop', () => {
    it('emits loopToggle when the toggle button is clicked', async () => {
      const loopToggleSpy = vi.fn();
      await render(LoopRegionComponent, {
        inputs: { vm: DEFAULT_VM },
        on: { loopToggle: loopToggleSpy },
      });

      await userEvent.click(screen.getByRole('button', { name: 'Off' }));

      expect(loopToggleSpy).toHaveBeenCalled();
    });
  });

  describe('template', () => {
    it('shows "Off" when loopEnabled is false', async () => {
      await setup();
      expect(screen.getByRole('button', { name: 'Off' })).toBeTruthy();
    });

    it('shows "On" when loopEnabled is true', async () => {
      await setup({ ...DEFAULT_VM, loopEnabled: true });
      expect(screen.getByRole('button', { name: 'On' })).toBeTruthy();
    });

    it('renders A time label from loopStart', async () => {
      await setup();
      expect(screen.getByText('A: 0:30')).toBeTruthy();
    });

    it('renders B time label from loopEnd', async () => {
      await setup();
      expect(screen.getByText('B: 1:30')).toBeTruthy();
    });
  });

  describe('pointer drag — start handle', () => {
    it('emits loopStartChange clamped away from loopEnd', async () => {
      const loopStartChangeSpy = vi.fn();
      const { container } = await render(LoopRegionComponent, {
        inputs: { vm: DEFAULT_VM },
        on: { loopStartChange: loopStartChangeSpy },
      });

      // track width=120px at left=0, so clientX maps 1:1 to seconds (duration=120)
      const trackEl = container.querySelector('.track-wrap') as HTMLElement;
      vi.spyOn(trackEl, 'getBoundingClientRect').mockReturnValue(
        { left: 0, width: 120, top: 0, bottom: 0, right: 120, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
      );

      const startHandle = container.querySelectorAll('.handle')[0] as HTMLElement;
      startHandle.setPointerCapture = vi.fn() as any;
      startHandle.releasePointerCapture = vi.fn() as any;

      startHandle.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true }));
      startHandle.dispatchEvent(new PointerEvent('pointermove', { clientX: 50, pointerId: 1, bubbles: true }));
      startHandle.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));

      // clientX=50 → time=50s; min(50, loopEnd(90) - 0.5) = min(50, 89.5) = 50
      expect(loopStartChangeSpy).toHaveBeenCalledWith(50);
    });
  });
});

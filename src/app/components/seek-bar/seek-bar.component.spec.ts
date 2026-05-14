import { render, screen, fireEvent } from '@testing-library/angular';
import { vi } from 'vitest';
import { SeekBarComponent } from './seek-bar.component';
import { SeekBarVm } from '../../models/view-models';

const DEFAULT_VM: SeekBarVm = { position: 30, duration: 120, disabled: false };

async function setup(vm: SeekBarVm = DEFAULT_VM) {
  return render(SeekBarComponent, { inputs: { vm } });
}

describe('SeekBarComponent', () => {
  it('creates successfully', async () => {
    const { fixture } = await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('displayValue', () => {
    it('returns vm.position when not dragging', async () => {
      await setup();
      expect(Number((screen.getByRole('slider') as HTMLInputElement).value)).toBe(30);
    });

    it('returns dragValue while dragging', async () => {
      await setup();
      const slider = screen.getByRole('slider') as HTMLInputElement;
      fireEvent.input(slider, { target: { value: '75' } });
      expect(Number(slider.value)).toBe(75);
    });
  });

  describe('progressPct', () => {
    it('calculates percentage of position within duration', async () => {
      const { fixture } = await setup();
      // position=30, duration=120 → 25%
      expect(fixture.componentInstance.progressPct).toBe(25);
    });

    it('returns 0 when duration is zero', async () => {
      const { fixture } = await setup({ position: 0, duration: 0, disabled: false });
      expect(fixture.componentInstance.progressPct).toBe(0);
    });
  });

  describe('onCommit', () => {
    it('emits seek with the slider value', async () => {
      const seekSpy = vi.fn();
      await render(SeekBarComponent, {
        inputs: { vm: DEFAULT_VM },
        on: { seek: seekSpy },
      });

      const slider = screen.getByRole('slider') as HTMLInputElement;
      slider.value = '60';
      fireEvent.change(slider);

      expect(seekSpy).toHaveBeenCalledWith(60);
    });

    it('clears isDragging after commit', async () => {
      await setup();
      const slider = screen.getByRole('slider') as HTMLInputElement;

      // Start dragging
      fireEvent.input(slider, { target: { value: '50' } });
      expect(Number(slider.value)).toBe(50);

      // Commit ends drag — displayValue reverts to vm.position (30)
      fireEvent.change(slider);
      expect(Number(slider.value)).toBe(30);
    });
  });

  describe('template', () => {
    it('renders current time from vm.position', async () => {
      await setup();
      expect(screen.getByText('0:30')).toBeTruthy();
    });

    it('renders total time from vm.duration', async () => {
      await setup();
      expect(screen.getByText('2:00')).toBeTruthy();
    });

    it('disables the slider when vm.disabled is true', async () => {
      const { rerender } = await setup();
      await rerender({ inputs: { vm: { ...DEFAULT_VM, disabled: true } } });
      expect((screen.getByRole('slider') as HTMLInputElement).disabled).toBe(true);
    });
  });
});

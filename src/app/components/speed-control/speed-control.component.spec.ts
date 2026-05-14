import { render, screen, fireEvent } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SpeedControlComponent } from './speed-control.component';
import { SpeedControlVm } from '../../models/view-models';

const DEFAULT_VM: SpeedControlVm = { speed: 1.0, disabled: false };

async function setup(vm: SpeedControlVm = DEFAULT_VM) {
  return render(SpeedControlComponent, { inputs: { vm } });
}

describe('SpeedControlComponent', () => {
  it('creates successfully', async () => {
    const { fixture } = await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('speedPercent display', () => {
    it('converts ratio 1.0 to 100%', async () => {
      await setup();
      expect(Number((screen.getByRole('slider') as HTMLInputElement).value)).toBe(100);
    });

    it('converts ratio 0.75 to 75%', async () => {
      await setup({ speed: 0.75, disabled: false });
      expect(Number((screen.getByRole('slider') as HTMLInputElement).value)).toBe(75);
    });

    it('rounds fractional results', async () => {
      await setup({ speed: 0.333, disabled: false });
      expect(Number((screen.getByRole('slider') as HTMLInputElement).value)).toBe(33);
    });
  });

  describe('onSliderInput', () => {
    it('emits speed ratio converted from percentage', async () => {
      const speedChangeSpy = vi.fn();
      await render(SpeedControlComponent, {
        inputs: { vm: DEFAULT_VM },
        on: { speedChange: speedChangeSpy },
      });

      fireEvent.input(screen.getByRole('slider'), { target: { value: '75' } });

      expect(speedChangeSpy).toHaveBeenCalledWith(0.75);
    });

    it('emits 2.0 for 200%', async () => {
      const speedChangeSpy = vi.fn();
      await render(SpeedControlComponent, {
        inputs: { vm: DEFAULT_VM },
        on: { speedChange: speedChangeSpy },
      });

      fireEvent.input(screen.getByRole('slider'), { target: { value: '200' } });

      expect(speedChangeSpy).toHaveBeenCalledWith(2.0);
    });
  });

  describe('setPreset', () => {
    it('emits the preset ratio when clicked', async () => {
      const speedChangeSpy = vi.fn();
      await render(SpeedControlComponent, {
        inputs: { vm: DEFAULT_VM },
        on: { speedChange: speedChangeSpy },
      });

      await userEvent.click(screen.getByRole('button', { name: '50%' }));

      expect(speedChangeSpy).toHaveBeenCalledWith(0.5);
    });
  });

  describe('template', () => {
    it('marks the active preset button', async () => {
      await setup({ speed: 0.75, disabled: false });

      expect(screen.getByRole('button', { name: '75%' }).classList.contains('active')).toBe(true);
    });

    it('shows no active preset when speed does not match any', async () => {
      await setup({ speed: 0.6, disabled: false });

      const activeButtons = screen.queryAllByRole('button').filter(b => b.classList.contains('active'));
      expect(activeButtons).toHaveLength(0);
    });
  });
});

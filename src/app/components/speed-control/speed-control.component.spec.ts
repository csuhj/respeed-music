import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpeedControlComponent } from './speed-control.component';
import { SpeedControlVm } from '../../models/view-models';

const DEFAULT_VM: SpeedControlVm = { speed: 1.0, disabled: false };

describe('SpeedControlComponent', () => {
  let fixture: ComponentFixture<SpeedControlComponent>;
  let component: SpeedControlComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpeedControlComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SpeedControlComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('vm', DEFAULT_VM);
    fixture.detectChanges();
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  describe('speedPercent', () => {
    it('converts ratio 1.0 to 100%', () => {
      expect(component.speedPercent).toBe(100);
    });

    it('converts ratio 0.75 to 75%', () => {
      fixture.componentRef.setInput('vm', { speed: 0.75, disabled: false });
      expect(component.speedPercent).toBe(75);
    });

    it('rounds fractional results', () => {
      fixture.componentRef.setInput('vm', { speed: 0.333, disabled: false });
      expect(component.speedPercent).toBe(33);
    });
  });

  describe('onSliderInput', () => {
    it('emits speed ratio converted from percentage', () => {
      const emitted: number[] = [];
      component.speedChange.subscribe(v => emitted.push(v));

      const slider = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      slider.value = '75';
      slider.dispatchEvent(new Event('input'));

      expect(emitted).toEqual([0.75]);
    });

    it('emits 2.0 for 200%', () => {
      const emitted: number[] = [];
      component.speedChange.subscribe(v => emitted.push(v));

      const slider = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      slider.value = '200';
      slider.dispatchEvent(new Event('input'));

      expect(emitted).toEqual([2.0]);
    });
  });

  describe('setPreset', () => {
    it('emits the preset ratio directly', () => {
      const emitted: number[] = [];
      component.speedChange.subscribe(v => emitted.push(v));

      component.setPreset(0.5);

      expect(emitted).toEqual([0.5]);
    });
  });

  describe('template', () => {
    it('marks the active preset button', () => {
      fixture.componentRef.setInput('vm', { speed: 0.75, disabled: false });
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.preset-btn') as NodeListOf<HTMLButtonElement>;
      const active = Array.from(buttons).filter(b => b.classList.contains('active'));
      expect(active.length).toBe(1);
      expect(active[0].textContent?.trim()).toBe('75%');
    });

    it('shows no active preset when speed does not match any', () => {
      fixture.componentRef.setInput('vm', { speed: 0.6, disabled: false });
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.preset-btn') as NodeListOf<HTMLButtonElement>;
      const active = Array.from(buttons).filter(b => b.classList.contains('active'));
      expect(active.length).toBe(0);
    });
  });
});

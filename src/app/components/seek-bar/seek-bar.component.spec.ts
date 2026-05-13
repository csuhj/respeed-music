import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SeekBarComponent } from './seek-bar.component';
import { SeekBarVm } from '../../models/view-models';

const DEFAULT_VM: SeekBarVm = { position: 30, duration: 120, disabled: false };

describe('SeekBarComponent', () => {
  let fixture: ComponentFixture<SeekBarComponent>;
  let component: SeekBarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeekBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SeekBarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('vm', DEFAULT_VM);
    fixture.detectChanges();
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  describe('displayValue', () => {
    it('returns vm.position when not dragging', () => {
      expect(component.displayValue).toBe(30);
    });

    it('returns dragValue while dragging', () => {
      const slider = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      slider.value = '75';
      slider.dispatchEvent(new Event('input'));
      expect(component.displayValue).toBe(75);
    });
  });

  describe('progressPct', () => {
    it('calculates percentage of position within duration', () => {
      // position=30, duration=120 → 25%
      expect(component.progressPct).toBe(25);
    });

    it('returns 0 when duration is zero', () => {
      fixture.componentRef.setInput('vm', { position: 0, duration: 0, disabled: false });
      expect(component.progressPct).toBe(0);
    });
  });

  describe('onCommit', () => {
    it('emits seek with the slider value', () => {
      const emitted: number[] = [];
      component.seek.subscribe(v => emitted.push(v));

      const slider = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      slider.value = '60';
      slider.dispatchEvent(new Event('change'));

      expect(emitted).toEqual([60]);
    });

    it('clears isDragging after commit', () => {
      const slider = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      // Start dragging
      slider.value = '50';
      slider.dispatchEvent(new Event('input'));
      expect(component.displayValue).toBe(50);

      // Commit ends drag
      slider.dispatchEvent(new Event('change'));
      // Now displayValue should come from vm.position again
      expect(component.displayValue).toBe(30);
    });
  });

  describe('template', () => {
    it('renders current time from vm.position', () => {
      const el = fixture.nativeElement.querySelector('.time.current') as HTMLElement;
      expect(el.textContent?.trim()).toBe('0:30');
    });

    it('renders total time from vm.duration', () => {
      const el = fixture.nativeElement.querySelector('.time.total') as HTMLElement;
      expect(el.textContent?.trim()).toBe('2:00');
    });

    it('disables the slider when vm.disabled is true', () => {
      fixture.componentRef.setInput('vm', { ...DEFAULT_VM, disabled: true });
      fixture.detectChanges();
      const slider = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      expect(slider.disabled).toBe(true);
    });
  });
});

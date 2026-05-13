import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LoopRegionComponent } from './loop-region.component';
import { LoopRegionVm } from '../../models/view-models';

const DEFAULT_VM: LoopRegionVm = {
  loopEnabled: false,
  loopStart: 30,
  loopEnd: 90,
  duration: 120,
};

describe('LoopRegionComponent', () => {
  let fixture: ComponentFixture<LoopRegionComponent>;
  let component: LoopRegionComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoopRegionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoopRegionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('vm', DEFAULT_VM);
    fixture.detectChanges();
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  describe('percentage calculations', () => {
    it('computes startPct from loopStart / duration', () => {
      // loopStart=30, duration=120 → 25%
      expect(component.startPct).toBe(25);
    });

    it('computes endPct from loopEnd / duration', () => {
      // loopEnd=90, duration=120 → 75%
      expect(component.endPct).toBe(75);
    });

    it('returns 0 for startPct when duration is 0', () => {
      fixture.componentRef.setInput('vm', { ...DEFAULT_VM, duration: 0 });
      expect(component.startPct).toBe(0);
    });

    it('fillWidth reflects the span between handles', () => {
      // endPct - startPct = 75 - 25 = 50%
      expect(component.fillWidth).toBe('50%');
    });
  });

  describe('toggleLoop', () => {
    it('emits loopToggle when toggleLoop() is called', () => {
      const emitSpy = vi.spyOn(component.loopToggle, 'emit');
      component.toggleLoop();
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('template', () => {
    it('shows "Off" when loopEnabled is false', () => {
      const btn = fixture.nativeElement.querySelector('.toggle-btn') as HTMLButtonElement;
      expect(btn.textContent?.trim()).toBe('Off');
    });

    it('shows "On" when loopEnabled is true', () => {
      fixture.componentRef.setInput('vm', { ...DEFAULT_VM, loopEnabled: true });
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('.toggle-btn') as HTMLButtonElement;
      expect(btn.textContent?.trim()).toBe('On');
    });

    it('renders A time label from loopStart', () => {
      const labels = fixture.nativeElement.querySelector('.time-labels') as HTMLElement;
      expect(labels.textContent).toContain('A: 0:30');
    });

    it('renders B time label from loopEnd', () => {
      const labels = fixture.nativeElement.querySelector('.time-labels') as HTMLElement;
      expect(labels.textContent).toContain('B: 1:30');
    });
  });

  describe('pointer drag — start handle', () => {
    it('emits loopStartChange clamped away from loopEnd', () => {
      const emitted: number[] = [];
      component.loopStartChange.subscribe(v => emitted.push(v));

      // track width=120px at left=0, so clientX maps 1:1 to seconds (duration=120)
      const trackEl = fixture.nativeElement.querySelector('.track-wrap') as HTMLElement;
      vi.spyOn(trackEl, 'getBoundingClientRect').mockReturnValue(
        { left: 0, width: 120, top: 0, bottom: 0, right: 120, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
      );

      const startHandle = fixture.nativeElement.querySelectorAll('.handle')[0] as HTMLElement;
      // jsdom has no setPointerCapture/releasePointerCapture — define them directly
      startHandle.setPointerCapture = vi.fn() as any;
      startHandle.releasePointerCapture = vi.fn() as any;

      startHandle.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true }));
      // Pointermove must go to the same element (no real pointer capture in jsdom)
      startHandle.dispatchEvent(new PointerEvent('pointermove', { clientX: 50, pointerId: 1, bubbles: true }));
      startHandle.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));

      // clientX=50 → time=50s; min(50, loopEnd(90) - 0.5) = min(50, 89.5) = 50
      expect(emitted).toEqual([50]);
    });
  });
});

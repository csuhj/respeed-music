import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { IosInstallHintComponent } from './ios-install-hint.component';

// Real iOS Safari UA — contains "iPhone" + "Safari" but no Chrome/Firefox markers
const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// iOS Chrome — contains "CriOS" which the component excludes
const IOS_CHROME_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/117.0.5938.117 Mobile/15E148 Safari/604.1';

// iOS Firefox — contains "FxiOS"
const IOS_FIREFOX_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/117.0 Mobile/15E148 Safari/604.1';

// Plain desktop browser
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36';

function mockUserAgent(ua: string): void {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(ua);
}

function setStandalone(value: boolean | undefined): void {
  Object.defineProperty(navigator, 'standalone', { value, configurable: true, writable: true });
}

function createFixture(): ComponentFixture<IosInstallHintComponent> {
  const fixture = TestBed.createComponent(IosInstallHintComponent);
  fixture.detectChanges(); // triggers ngOnInit
  return fixture;
}

describe('IosInstallHintComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    setStandalone(undefined); // not running as installed PWA

    await TestBed.configureTestingModule({
      imports: [IosInstallHintComponent],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  describe('ngOnInit — visibility logic', () => {
    it('shows the hint on iOS Safari when not standalone and not dismissed', () => {
      mockUserAgent(IOS_SAFARI_UA);
      const fixture = createFixture();
      expect(fixture.componentInstance.visible()).toBe(true);
    });

    it('stays hidden on a desktop browser', () => {
      mockUserAgent(DESKTOP_UA);
      const fixture = createFixture();
      expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('stays hidden on iOS Chrome (CriOS in UA)', () => {
      mockUserAgent(IOS_CHROME_UA);
      const fixture = createFixture();
      expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('stays hidden on iOS Firefox (FxiOS in UA)', () => {
      mockUserAgent(IOS_FIREFOX_UA);
      const fixture = createFixture();
      expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('stays hidden when running as an installed standalone PWA', () => {
      mockUserAgent(IOS_SAFARI_UA);
      setStandalone(true);
      const fixture = createFixture();
      expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('stays hidden when the user has previously dismissed the hint', () => {
      mockUserAgent(IOS_SAFARI_UA);
      localStorage.setItem('pwa-hint-dismissed', 'true');
      const fixture = createFixture();
      expect(fixture.componentInstance.visible()).toBe(false);
    });
  });

  describe('dismiss()', () => {
    it('sets visible to false', () => {
      mockUserAgent(IOS_SAFARI_UA);
      const fixture = createFixture();
      const component = fixture.componentInstance;

      expect(component.visible()).toBe(true);
      component.dismiss();
      expect(component.visible()).toBe(false);
    });

    it('persists the dismissal to localStorage', () => {
      mockUserAgent(IOS_SAFARI_UA);
      const fixture = createFixture();
      fixture.componentInstance.dismiss();
      expect(localStorage.getItem('pwa-hint-dismissed')).toBe('true');
    });

    it('hides the modal in the DOM after dismissal', () => {
      mockUserAgent(IOS_SAFARI_UA);
      const fixture = createFixture();
      expect(fixture.nativeElement.querySelector('.hint-backdrop')).toBeTruthy();

      fixture.componentInstance.dismiss();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.hint-backdrop')).toBeFalsy();
    });
  });

  describe('template', () => {
    it('renders nothing when not visible', () => {
      mockUserAgent(DESKTOP_UA);
      const fixture = createFixture();
      expect(fixture.nativeElement.querySelector('.hint-backdrop')).toBeFalsy();
    });

    it('renders the modal sheet when visible', () => {
      mockUserAgent(IOS_SAFARI_UA);
      const fixture = createFixture();
      expect(fixture.nativeElement.querySelector('.hint-sheet')).toBeTruthy();
    });

    it('clicking the backdrop dismisses the hint', () => {
      mockUserAgent(IOS_SAFARI_UA);
      const fixture = createFixture();
      const component = fixture.componentInstance;

      fixture.nativeElement.querySelector('.hint-backdrop').click();
      expect(component.visible()).toBe(false);
    });

    it('clicking the close button dismisses the hint', () => {
      mockUserAgent(IOS_SAFARI_UA);
      const fixture = createFixture();
      const component = fixture.componentInstance;

      fixture.nativeElement.querySelector('.hint-close').click();
      expect(component.visible()).toBe(false);
    });

    it('clicking inside the sheet does not dismiss the hint', () => {
      mockUserAgent(IOS_SAFARI_UA);
      const fixture = createFixture();
      const component = fixture.componentInstance;

      fixture.nativeElement.querySelector('.hint-sheet').click();
      expect(component.visible()).toBe(true);
    });
  });
});

import { render, fireEvent } from '@testing-library/angular';
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

describe('IosInstallHintComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    setStandalone(undefined); // not running as installed PWA
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('ngOnInit — visibility logic', () => {
    it('shows the hint on iOS Safari when not standalone and not dismissed', async () => {
      mockUserAgent(IOS_SAFARI_UA);
      await render(IosInstallHintComponent);
      expect(document.querySelector('.hint-backdrop')).toBeTruthy();
    });

    it('stays hidden on a desktop browser', async () => {
      mockUserAgent(DESKTOP_UA);
      await render(IosInstallHintComponent);
      expect(document.querySelector('.hint-backdrop')).toBeFalsy();
    });

    it('stays hidden on iOS Chrome (CriOS in UA)', async () => {
      mockUserAgent(IOS_CHROME_UA);
      await render(IosInstallHintComponent);
      expect(document.querySelector('.hint-backdrop')).toBeFalsy();
    });

    it('stays hidden on iOS Firefox (FxiOS in UA)', async () => {
      mockUserAgent(IOS_FIREFOX_UA);
      await render(IosInstallHintComponent);
      expect(document.querySelector('.hint-backdrop')).toBeFalsy();
    });

    it('stays hidden when running as an installed standalone PWA', async () => {
      mockUserAgent(IOS_SAFARI_UA);
      setStandalone(true);
      await render(IosInstallHintComponent);
      expect(document.querySelector('.hint-backdrop')).toBeFalsy();
    });

    it('stays hidden when the user has previously dismissed the hint', async () => {
      mockUserAgent(IOS_SAFARI_UA);
      localStorage.setItem('pwa-hint-dismissed', 'true');
      await render(IosInstallHintComponent);
      expect(document.querySelector('.hint-backdrop')).toBeFalsy();
    });
  });

  describe('dismiss()', () => {
    it('hides the modal in the DOM', async () => {
      mockUserAgent(IOS_SAFARI_UA);
      await render(IosInstallHintComponent);
      expect(document.querySelector('.hint-backdrop')).toBeTruthy();

      fireEvent.click(document.querySelector('.hint-close') as HTMLElement);

      expect(document.querySelector('.hint-backdrop')).toBeFalsy();
    });

    it('persists the dismissal to localStorage', async () => {
      mockUserAgent(IOS_SAFARI_UA);
      const { fixture } = await render(IosInstallHintComponent);
      fixture.componentInstance.dismiss();
      expect(localStorage.getItem('pwa-hint-dismissed')).toBe('true');
    });
  });

  describe('template', () => {
    it('renders nothing when not visible', async () => {
      mockUserAgent(DESKTOP_UA);
      await render(IosInstallHintComponent);
      expect(document.querySelector('.hint-backdrop')).toBeFalsy();
    });

    it('renders the modal sheet when visible', async () => {
      mockUserAgent(IOS_SAFARI_UA);
      await render(IosInstallHintComponent);
      expect(document.querySelector('.hint-sheet')).toBeTruthy();
    });

    it('clicking the backdrop dismisses the hint', async () => {
      mockUserAgent(IOS_SAFARI_UA);
      await render(IosInstallHintComponent);

      fireEvent.click(document.querySelector('.hint-backdrop') as HTMLElement);

      expect(document.querySelector('.hint-backdrop')).toBeFalsy();
    });

    it('clicking the close button dismisses the hint', async () => {
      mockUserAgent(IOS_SAFARI_UA);
      await render(IosInstallHintComponent);

      fireEvent.click(document.querySelector('.hint-close') as HTMLElement);

      expect(document.querySelector('.hint-backdrop')).toBeFalsy();
    });

    it('clicking inside the sheet does not dismiss the hint', async () => {
      mockUserAgent(IOS_SAFARI_UA);
      await render(IosInstallHintComponent);

      fireEvent.click(document.querySelector('.hint-sheet') as HTMLElement);

      expect(document.querySelector('.hint-backdrop')).toBeTruthy();
    });
  });
});

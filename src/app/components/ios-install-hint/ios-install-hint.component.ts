import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ios-install-hint',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ios-install-hint.component.html',
  styleUrl: './ios-install-hint.component.scss',
})
export class IosInstallHintComponent implements OnInit {
  visible = signal(false);

  ngOnInit() {
    const isIosSafari = this.detectIosSafari();
    const isStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem('pwa-hint-dismissed') === 'true';

    if (isIosSafari && !isStandalone && !dismissed) {
      this.visible.set(true);
    }
  }

  dismiss() {
    localStorage.setItem('pwa-hint-dismissed', 'true');
    this.visible.set(false);
  }

  private detectIosSafari(): boolean {
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    // Chrome, Firefox, and other browsers on iOS include their name in the UA;
    // Safari does not — it only has "Safari" and "Mobile".
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios|opios/i.test(ua);
    return isIos && isSafari;
  }
}

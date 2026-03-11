import { Component, inject, signal } from '@angular/core';
import { PwaInstallService } from '../../../services/pwa-install.service';

@Component({
  selector: 'app-install-section',
  standalone: true,
  templateUrl: './install-section.component.html',
  styleUrl: './install-section.component.scss'
})
export class InstallSectionComponent {
  private pwaService = inject(PwaInstallService);

  installFlow = this.pwaService.installFlow;
  platform = this.pwaService.platform;
  isInstalled = this.pwaService.isInstalled;
  showGuide = signal(false);

  async install(): Promise<void> {
    if (this.installFlow() === 'native') {
      await this.pwaService.triggerNativeInstall();
    } else {
      this.showGuide.set(true);
    }
  }

  get isIosSafari(): boolean {
    const p = this.platform();
    return p.os === 'ios' && p.browser === 'safari';
  }

  get isDesktopSafari(): boolean {
    const p = this.platform();
    return (p.os === 'macos' || p.os === 'windows' || p.os === 'linux') && p.browser === 'safari';
  }

  get isFirefoxAndroid(): boolean {
    const p = this.platform();
    return p.os === 'android' && p.browser === 'firefox';
  }

  get suggestedBrowser(): string {
    const p = this.platform();
    if (p.os === 'ios') return 'Safari';
    if (p.os === 'android' || p.os === 'windows' || p.os === 'macos' || p.os === 'linux') return 'Chrome ou Edge';
    return 'Chrome, Edge ou Safari';
  }
}

import { Component, inject, signal } from '@angular/core';
import { PwaInstallService } from '../../services/pwa-install.service';

@Component({
  selector: 'app-install-prompt',
  standalone: true,
  templateUrl: './install-prompt.component.html',
  styleUrl: './install-prompt.component.scss'
})
export class InstallPromptComponent {
  private pwaService = inject(PwaInstallService);

  showPrompt = this.pwaService.showPrompt;
  installFlow = this.pwaService.installFlow;
  platform = this.pwaService.platform;
  dontShowAgain = signal(false);

  async install(): Promise<void> {
    await this.pwaService.triggerNativeInstall();
  }

  dismiss(): void {
    this.pwaService.dismissPrompt(this.dontShowAgain());
  }

  toggleDontShow(): void {
    this.dontShowAgain.update(v => !v);
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
    return 'Chrome ou Edge';
  }
}

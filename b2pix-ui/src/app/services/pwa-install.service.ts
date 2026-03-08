import { Injectable, signal, computed } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type OS = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
type Browser = 'chrome' | 'edge' | 'firefox' | 'safari' | 'samsung' | 'unknown';
type InstallFlow = 'native' | 'manual-guide' | 'browser-suggestion';

interface Platform {
  os: OS;
  browser: Browser;
}

const STORAGE_KEY = 'pwa-install-dismissed';
const COOLDOWN_DAYS = 7;

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  private _installPromptEvent = signal<BeforeInstallPromptEvent | null>(null);
  private _isInstalled = signal(false);
  private _showPrompt = signal(false);
  private _platform = signal<Platform>(this.detectPlatform());

  readonly isInstalled = this._isInstalled.asReadonly();
  readonly showPrompt = this._showPrompt.asReadonly();
  readonly platform = this._platform.asReadonly();

  readonly installFlow = computed<InstallFlow>(() => {
    if (this._installPromptEvent()) return 'native';
    return this.determineInstallFlow();
  });

  constructor() {
    this.checkIfInstalled();
    this.captureInstallEvent();
    this.scheduleAutoShow();
  }

  private detectPlatform(): Platform {
    const ua = navigator.userAgent.toLowerCase();

    let os: OS = 'unknown';
    if (/iphone|ipad|ipod/.test(ua)) os = 'ios';
    else if (/android/.test(ua)) os = 'android';
    else if (/windows/.test(ua)) os = 'windows';
    else if (/macintosh|mac os/.test(ua)) os = 'macos';
    else if (/linux/.test(ua)) os = 'linux';

    let browser: Browser = 'unknown';
    if (/samsungbrowser/.test(ua)) browser = 'samsung';
    else if (/edg\//.test(ua)) browser = 'edge';
    else if (/chrome|crios/.test(ua) && !/edg\//.test(ua)) browser = 'chrome';
    else if (/firefox|fxios/.test(ua)) browser = 'firefox';
    else if (/safari/.test(ua) && !/chrome|crios/.test(ua)) browser = 'safari';

    return { os, browser };
  }

  private checkIfInstalled(): void {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      localStorage.getItem('pwa-installed') === 'true';

    this._isInstalled.set(isStandalone);

    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      if (e.matches) {
        this._isInstalled.set(true);
        localStorage.setItem('pwa-installed', 'true');
      }
    });
  }

  private captureInstallEvent(): void {
    // Pick up event captured before Angular booted
    const earlyEvent = (window as any).__pwaInstallEvent;
    if (earlyEvent) {
      this._installPromptEvent.set(earlyEvent);
    }

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this._installPromptEvent.set(e as BeforeInstallPromptEvent);
    });

    window.addEventListener('appinstalled', () => {
      this._isInstalled.set(true);
      this._showPrompt.set(false);
      localStorage.setItem('pwa-installed', 'true');
    });
  }

  private determineInstallFlow(): InstallFlow {
    const { os, browser } = this._platform();

    if (os === 'ios' && browser === 'safari') return 'manual-guide';
    if (os === 'ios') return 'browser-suggestion';
    if (os === 'android' && browser === 'firefox') return 'manual-guide';
    if ((os === 'macos' || os === 'windows' || os === 'linux') && browser === 'safari') return 'manual-guide';
    if ((os === 'macos' || os === 'windows' || os === 'linux') && browser === 'firefox') return 'browser-suggestion';

    return 'native';
  }

  private scheduleAutoShow(): void {
    if (this._isInstalled()) return;
    if (this.isDismissed()) return;

    setTimeout(() => {
      if (!this._isInstalled() && !this.isDismissed()) {
        this._showPrompt.set(true);
      }
    }, 3000);
  }

  private isDismissed(): boolean {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const data = JSON.parse(stored);
    if (data.forever) return true;

    const dismissedAt = new Date(data.date).getTime();
    const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt < cooldownMs;
  }

  async triggerNativeInstall(): Promise<boolean> {
    const event = this._installPromptEvent();
    if (!event) return false;

    await event.prompt();
    const result = await event.userChoice;

    if (result.outcome === 'accepted') {
      this._isInstalled.set(true);
      this._showPrompt.set(false);
      localStorage.setItem('pwa-installed', 'true');
      return true;
    }

    return false;
  }

  dismissPrompt(dontShowAgain: boolean): void {
    this._showPrompt.set(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      forever: dontShowAgain,
      date: new Date().toISOString()
    }));
  }

  showInstallPrompt(): void {
    if (!this._isInstalled()) {
      this._showPrompt.set(true);
    }
  }
}

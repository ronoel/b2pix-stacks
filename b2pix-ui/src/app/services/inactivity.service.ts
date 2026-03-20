import { Injectable, inject, signal, OnDestroy, NgZone } from '@angular/core';
import { WalletManagerService } from '../libs/wallet/wallet-manager.service';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const WARNING_BEFORE_MS = 60 * 1000; // warn 60s before logout
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const;

@Injectable({
  providedIn: 'root'
})
export class InactivityService implements OnDestroy {
  private walletManager = inject(WalletManagerService);
  private ngZone = inject(NgZone);

  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private warningId: ReturnType<typeof setTimeout> | null = null;
  private countdownId: ReturnType<typeof setInterval> | null = null;
  private boundResetTimer = this.resetTimer.bind(this);
  private started = false;

  /** Whether the warning banner is showing */
  showWarning = signal(false);

  /** Seconds remaining before logout */
  secondsRemaining = signal(0);

  start(): void {
    if (this.started) return;
    this.started = true;

    this.ngZone.runOutsideAngular(() => {
      for (const event of ACTIVITY_EVENTS) {
        document.addEventListener(event, this.boundResetTimer, { passive: true });
      }
    });

    this.resetTimer();
  }

  stop(): void {
    this.started = false;
    this.clearTimers();

    for (const event of ACTIVITY_EVENTS) {
      document.removeEventListener(event, this.boundResetTimer);
    }

    this.ngZone.run(() => {
      this.showWarning.set(false);
      this.secondsRemaining.set(0);
    });
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private resetTimer(): void {
    this.clearTimers();

    if (this.showWarning()) {
      this.ngZone.run(() => {
        this.showWarning.set(false);
        this.secondsRemaining.set(0);
      });
    }

    const warningAt = INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS;

    this.warningId = setTimeout(() => {
      this.ngZone.run(() => {
        this.showWarning.set(true);
        this.secondsRemaining.set(Math.ceil(WARNING_BEFORE_MS / 1000));

        this.countdownId = setInterval(() => {
          this.ngZone.run(() => {
            const remaining = this.secondsRemaining() - 1;
            this.secondsRemaining.set(Math.max(0, remaining));
          });
        }, 1000);
      });
    }, warningAt);

    this.timeoutId = setTimeout(() => {
      this.ngZone.run(() => {
        this.stop();
        this.walletManager.signOut();
      });
    }, INACTIVITY_TIMEOUT_MS);
  }

  private clearTimers(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.warningId !== null) {
      clearTimeout(this.warningId);
      this.warningId = null;
    }
    if (this.countdownId !== null) {
      clearInterval(this.countdownId);
      this.countdownId = null;
    }
  }
}

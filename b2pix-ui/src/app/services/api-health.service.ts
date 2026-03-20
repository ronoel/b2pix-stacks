import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

export const SKIP_API_HEALTH_CHECK = new HttpContextToken<boolean>(() => false);

const FAILURE_THRESHOLD = 3;
const RETRY_INTERVAL_SECONDS = 15;

@Injectable({
  providedIn: 'root'
})
export class ApiHealthService {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  private consecutiveFailures = signal(0);
  private systemBlocked = signal(false);
  private dismissed = signal(false);
  private _retryCountdown = signal(0);
  private _isChecking = signal(false);
  private countdownSub: Subscription | null = null;

  isUnavailable = computed(() =>
    (this.consecutiveFailures() >= FAILURE_THRESHOLD || this.systemBlocked()) && !this.dismissed()
  );

  retryCountdown = this._retryCountdown.asReadonly();
  isChecking = this._isChecking.asReadonly();

  reportFailure(): void {
    this.consecutiveFailures.update(n => n + 1);

    if (this.consecutiveFailures() >= FAILURE_THRESHOLD && !this.countdownSub) {
      this.dismissed.set(false);
      this.startRecoveryLoop();
    }
  }

  reportSystemBlock(): void {
    this.systemBlocked.set(true);
    this.dismissed.set(false);
    if (!this.countdownSub) {
      this.startRecoveryLoop();
    }
  }

  reportSuccess(): void {
    this.consecutiveFailures.set(0);
    this.systemBlocked.set(false);
    this.dismissed.set(false);
    this.stopRecoveryLoop();
  }

  dismiss(): void {
    this.dismissed.set(true);
    this.consecutiveFailures.set(0);
    this.systemBlocked.set(false);
    this.stopRecoveryLoop();
  }

  private startRecoveryLoop(): void {
    this._retryCountdown.set(RETRY_INTERVAL_SECONDS);

    this.countdownSub = interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this._isChecking()) return;

        const current = this._retryCountdown();

        if (current > 1) {
          this._retryCountdown.update(n => n - 1);
        } else {
          this._retryCountdown.set(0);
          this.checkHealth();
        }
      });
  }

  private stopRecoveryLoop(): void {
    this.countdownSub?.unsubscribe();
    this.countdownSub = null;
    this._retryCountdown.set(0);
    this._isChecking.set(false);
  }

  private checkHealth(): void {
    this._isChecking.set(true);

    this.http.get(`${environment.apiUrl}/v1/quote/btc`, {
      context: new HttpContext().set(SKIP_API_HEALTH_CHECK, true)
    }).subscribe({
      next: () => {
        this._isChecking.set(false);
        this.reportSuccess();
      },
      error: () => {
        this._isChecking.set(false);
        this._retryCountdown.set(RETRY_INTERVAL_SECONDS);
      }
    });
  }
}

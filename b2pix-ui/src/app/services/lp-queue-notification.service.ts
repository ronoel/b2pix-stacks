import { Injectable, inject, effect, signal, computed, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, timer, EMPTY } from 'rxjs';
import { switchMap, catchError, filter } from 'rxjs/operators';
import { WalletManagerService } from '../libs/wallet/wallet-manager.service';
import { AccountValidationService } from '../shared/api/account-validation.service';
import { PixPayoutRequestService } from '../shared/api/pix-payout-request.service';

@Injectable({ providedIn: 'root' })
export class LpQueueNotificationService implements OnDestroy {
  private router = inject(Router);
  private walletManager = inject(WalletManagerService);
  private accountValidation = inject(AccountValidationService);
  private payoutRequestService = inject(PixPayoutRequestService);

  private pollSub: Subscription | null = null;
  private routeSub: Subscription;
  private previousCount = 0;

  readonly pendingCount = signal(0);
  readonly hasNotification = computed(() => this.pendingCount() > 0);
  readonly dismissed = signal(false);

  constructor() {
    this.routeSub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      filter(e => e.urlAfterRedirects.startsWith('/lp-dashboard'))
    ).subscribe(() => this.dismiss());

    effect(() => {
      if (this.walletManager.isLoggedInSignal()) {
        this.checkAndStartPolling();
      } else {
        this.stopPolling();
        this.pendingCount.set(0);
        this.dismissed.set(false);
        this.previousCount = 0;
      }
    });
  }

  dismiss(): void {
    this.dismissed.set(true);
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.routeSub.unsubscribe();
  }

  private checkAndStartPolling(): void {
    this.accountValidation.getAccount().subscribe(account => {
      if (account.is_lp) {
        this.startPolling();
      }
    });
  }

  private startPolling(): void {
    this.stopPolling();

    this.pollSub = timer(0, 30_000).pipe(
      switchMap(() =>
        this.payoutRequestService.getQueue({ page: 1, limit: 1 }).pipe(
          catchError(() => EMPTY)
        )
      )
    ).subscribe(response => {
      const count = response.has_more ? response.items.length + 1 : response.items.length;

      if (this.previousCount === 0 && count > 0) {
        this.dismissed.set(false);
      }

      this.previousCount = count;
      this.pendingCount.set(count);
    });
  }

  private stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }
}

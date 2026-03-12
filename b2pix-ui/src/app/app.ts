import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { LoadingComponent } from './components/loading/loading.component';
import { ApiUnavailableComponent } from './components/api-unavailable/api-unavailable.component';
import { FooterComponent } from './components/footer/footer.component';
import { TabBarComponent } from './components/tab-bar/tab-bar.component';
import { WalletManagerService } from './libs/wallet/wallet-manager.service';
import { AppUpdateService } from './services/app-update.service';
import { LpQueueNotificationService } from './services/lp-queue-notification.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingComponent, ApiUnavailableComponent, FooterComponent, TabBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private router = inject(Router);
  private walletManager = inject(WalletManagerService);
  protected appUpdate = inject(AppUpdateService);
  protected lpNotification = inject(LpQueueNotificationService);

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: '/' }
  );

  showTabBar(): boolean {
    if (!this.walletManager.isLoggedInSignal()) return false;
    const url = this.currentUrl();
    const authPaths = ['/dashboard', '/buy', '/sell', '/pix-payment', '/wallet', '/send', '/lp-dashboard', '/lp-register', '/pix-account', '/manager-dashboard', '/order-analysis', '/payment-requests', '/pix-moderation', '/payout-disputes', '/analyzing-order'];
    return authPaths.some(p => url === p || url.startsWith(p + '/'));
  }

  navigateToLpDashboard(): void {
    this.lpNotification.dismiss();
    this.router.navigate(['/lp-dashboard']);
  }

  dismissLpNotification(event: Event): void {
    event.stopPropagation();
    this.lpNotification.dismiss();
  }
}

import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { LoadingComponent } from './components/loading/loading.component';
import { FooterComponent } from './components/footer/footer.component';
import { TabBarComponent } from './components/tab-bar/tab-bar.component';
import { WalletManagerService } from './libs/wallet/wallet-manager.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingComponent, FooterComponent, TabBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private router = inject(Router);
  private walletManager = inject(WalletManagerService);

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
    const authPaths = ['/dashboard', '/buy', '/sell', '/pix-payment', '/wallet', '/send', '/lp-dashboard', '/lp-register', '/pix-account', '/order-analysis', '/payment-requests', '/pix-moderation', '/payout-disputes', '/analyzing-order'];
    return authPaths.some(p => url === p || url.startsWith(p + '/'));
  }
}

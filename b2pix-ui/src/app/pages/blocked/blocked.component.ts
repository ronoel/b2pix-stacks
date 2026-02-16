import { Component, inject } from '@angular/core';

import { Router } from '@angular/router';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';

@Component({
  selector: 'app-blocked',
  imports: [],
  templateUrl: './blocked.component.html',
  styleUrl: './blocked.component.scss'
})
export class BlockedComponent {
  private router = inject(Router);
  private walletManager = inject(WalletManagerService);

  goHome() {
    // Sign out user and redirect to home
    this.walletManager.signOut();
    this.router.navigate(['/']);
  }

  contactSupport() {
    // This could open a support form, email, or external support system
    window.open('mailto:support@b2pix.com?subject=Conta%20Bloqueada', '_blank');
  }
}

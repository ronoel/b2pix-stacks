import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';

/**
 * Guard simples que verifica apenas se a carteira está conectada
 * Usado nas páginas de validação
 */
export const requireWalletOnlyGuard: CanActivateFn = (route, state) => {
  const walletManager = inject(WalletManagerService);
  const router = inject(Router);

  if (!walletManager.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  return true;
};

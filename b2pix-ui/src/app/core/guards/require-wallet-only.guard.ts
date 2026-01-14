import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WalletService } from '../../libs/wallet.service';

/**
 * Guard simples que verifica apenas se a carteira está conectada
 * Usado nas páginas de validação
 */
export const requireWalletOnlyGuard: CanActivateFn = (route, state) => {
  const walletService = inject(WalletService);
  const router = inject(Router);

  if (!walletService.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  return true;
};

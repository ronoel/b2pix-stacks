import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { AccountValidationService } from '../../shared/api/account-validation.service';

/**
 * Guard que verifica se o usuário tem email e PIX verificados.
 * Se não estiver validado, redireciona para a página de validação necessária.
 */
export const accountValidationGuard: CanActivateFn = (route, state) => {
  const walletManager = inject(WalletManagerService);
  const validationService = inject(AccountValidationService);
  const router = inject(Router);

  // 1. Verificar se carteira está conectada
  if (!walletManager.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  // 2. Verificar status de validação usando getAccount()
  return validationService.getAccount().pipe(
    map((account) => {
      // Se email OU PIX não estão verificados, redirecionar para página de validação
      if (!account.email_verified || !account.pix_verified) {
        router.navigate(['/account-validation-required'], {
          queryParams: { returnUrl: state.url }
        });
        return false;
      }

      // Ambos verificados - permitir acesso
      return true;
    }),
    catchError((error) => {
      console.error('Validation check error:', error);
      // Em caso de erro, redirecionar para página de validação
      router.navigate(['/account-validation-required'], {
        queryParams: { returnUrl: state.url }
      });
      return of(false);
    })
  );
};

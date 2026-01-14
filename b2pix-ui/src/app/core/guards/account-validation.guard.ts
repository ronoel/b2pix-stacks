import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { WalletService } from '../../libs/wallet.service';
import { AccountValidationService } from '../../shared/api/account-validation.service';

/**
 * Guard que verifica se o usuário tem email e PIX verificados
 * Substitui o inviteRequiredGuard
 */
export const accountValidationGuard: CanActivateFn = (route, state) => {
  const walletService = inject(WalletService);
  const validationService = inject(AccountValidationService);
  const router = inject(Router);

  // 1. Verificar se carteira está conectada
  if (!walletService.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  // 2. Verificar status de validação
  return validationService.getValidationStatus().pipe(
    map((status) => {
      // Verificar email primeiro
      if (!status.email_verified) {
        router.navigate(['/email-validation'], {
          queryParams: { returnUrl: state.url }
        });
        return false;
      }

      // Verificar PIX
      if (!status.pix_verified) {
        router.navigate(['/pix-validation'], {
          queryParams: { returnUrl: state.url }
        });
        return false;
      }

      // Ambos verificados - permitir acesso
      return true;
    }),
    catchError((error) => {
      console.error('Validation check error:', error);
      // Em caso de erro, redirecionar para validação de email
      router.navigate(['/email-validation'], {
        queryParams: { returnUrl: state.url }
      });
      return of(false);
    })
  );
};

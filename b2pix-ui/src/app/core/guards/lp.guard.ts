import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError } from 'rxjs';
import { of } from 'rxjs';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { AccountValidationService } from '../../shared/api/account-validation.service';

export const lpGuard: CanActivateFn = (route, state) => {
  const walletManager = inject(WalletManagerService);
  const accountValidationService = inject(AccountValidationService);
  const router = inject(Router);

  if (!walletManager.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  return accountValidationService.getAccount().pipe(
    map(account => {
      if (account.is_lp) return true;
      router.navigate(['/dashboard']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/dashboard']);
      return of(false);
    })
  );
};

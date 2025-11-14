import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { WalletService } from "../../libs/wallet.service";

export const authGuard: CanActivateFn = () => {
  const walletService = inject(WalletService);
  const router = inject(Router);

  // Check if wallet is connected
  if (!walletService.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  return true;
};

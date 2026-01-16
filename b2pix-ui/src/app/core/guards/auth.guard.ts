import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { WalletManagerService } from "../../libs/wallet/wallet-manager.service";

export const authGuard: CanActivateFn = () => {
  const walletManager = inject(WalletManagerService);
  const router = inject(Router);

  // Check if wallet is connected
  if (!walletManager.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  return true;
};

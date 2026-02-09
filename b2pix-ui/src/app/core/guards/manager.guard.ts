import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { WalletManagerService } from "../../libs/wallet/wallet-manager.service";
import { environment } from "../../../environments/environment";

export const managerGuard: CanActivateFn = (route, state) => {
  const walletManager = inject(WalletManagerService);
  const router = inject(Router);

  // Check if wallet is connected
  if (!walletManager.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  // Check if current wallet address is the manager address
  const currentAddress = walletManager.getSTXAddress();
  if (currentAddress !== environment.b2pixAddress) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
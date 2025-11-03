import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { WalletService } from "../../libs/wallet.service";
import { environment } from "../../../environments/environment";

export const managerGuard: CanActivateFn = (route, state) => {
  const walletService = inject(WalletService);
  const router = inject(Router);

  // Check if wallet is connected
  if (!walletService.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  // Check if current wallet address is the manager address
  const currentAddress = walletService.getSTXAddress();
  if (currentAddress !== environment.b2pixAddress) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
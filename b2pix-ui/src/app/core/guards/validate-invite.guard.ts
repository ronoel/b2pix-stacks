import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { WalletService } from "../../libs/wallet.service";
import { InvitesService } from "../../shared/api/invites.service";
import { map, catchError, of } from "rxjs";

export const validateInviteGuard: CanActivateFn = (route, state) => {
  const walletService = inject(WalletService);
  const invitesService = inject(InvitesService);
  const router = inject(Router);

  // Check if wallet is connected
  if (!walletService.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  // Check invite status
  return invitesService.getWalletInvite().pipe(
    map((invite) => {
      if (!invite) {
        // No invite found, redirect to invite validation
        return true;
      }

      if (invite.status === 'blocked') {
        router.navigate(['/blocked']);
        return false;
      }
      
      if (invite.status === 'claimed') {
        router.navigate(['/']);
        return false;
      }

      // Any other status (pending, not_found, etc.)
      return true;
    }),
    catchError(() => {
      
      router.navigate(['/']);
      return of(false);
    })
  );
};

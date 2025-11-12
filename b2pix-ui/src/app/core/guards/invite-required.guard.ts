import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { WalletService } from "../../libs/wallet.service";
import { InvitesService } from "../../shared/api/invites.service";
import { map, catchError, of } from "rxjs";

export const inviteRequiredGuard: CanActivateFn = () => {
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
        router.navigate(['/invite-validation']);
        return false;
      }

      if (invite.status === 'blocked') {
        router.navigate(['/blocked']);
        return false;
      }

      if (invite.status === 'claimed') {
        return true;
      }

      router.navigate(['/invite-validation']);
      return false;
    }),
    catchError(() => {
      // No invite found
      router.navigate(['/invite-validation']);
      return of(false);
    })
  );
};

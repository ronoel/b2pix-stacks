import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { WalletManagerService } from "../../libs/wallet/wallet-manager.service";
import { InvitesService } from "../../shared/api/invites.service";
import { map, catchError, of } from "rxjs";

export const inviteRequiredGuard: CanActivateFn = (route, state) => {
  const walletManager = inject(WalletManagerService);
  const invitesService = inject(InvitesService);
  const router = inject(Router);

  // Check if wallet is connected
  if (!walletManager.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  // Check invite status
  return invitesService.getWalletInvite().pipe(
    map((invite) => {
      if (!invite) {
        // No invite found, redirect to invite validation with returnUrl
        router.navigate(['/invite-validation'], {
          queryParams: { returnUrl: state.url }
        });
        return false;
      }

      if (invite.status === 'blocked') {
        router.navigate(['/blocked']);
        return false;
      }

      if (invite.status === 'claimed') {
        return true;
      }

      router.navigate(['/invite-validation'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }),
    catchError(() => {
      // No invite found
      router.navigate(['/invite-validation'], {
        queryParams: { returnUrl: state.url }
      });
      return of(false);
    })
  );
};

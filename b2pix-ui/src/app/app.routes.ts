import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { validateInviteGuard } from './core/guards/validate-invite.guard';
import { managerGuard } from './core/guards/manager.guard';
import { inviteRequiredGuard } from './core/guards/invite-required.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'request-invite',
    loadComponent: () => import('./pages/request-invite/request-invite.component').then(m => m.RequestInviteComponent)
  },
  {
    path: 'pending-approval',
    loadComponent: () => import('./pages/pending-approval/pending-approval.component').then(m => m.PendingApprovalComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'buy',
    loadComponent: () => import('./pages/buy/buy.component').then(m => m.BuyComponent),
    canActivate: [authGuard]
  },
  {
    path: 'buy/:id',
    loadComponent: () => import('./pages/buy-details/buy-details.component').then(m => m.BuyDetailsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sell',
    loadComponent: () => import('./pages/sell/sell.component').then(m => m.SellComponent),
    canActivate: [inviteRequiredGuard]
  },
  {
    path: 'my-ads',
    loadComponent: () => import('./pages/my-ads/my-ads.component').then(m => m.MyAdsComponent),
    canActivate: [inviteRequiredGuard]
  },
  {
    path: 'my-ads/:advertisement_id',
    loadComponent: () => import('./pages/ad-details/ad-details.component').then(m => m.AdDetailsComponent),
    canActivate: [inviteRequiredGuard]
  },
  {
    path: 'pix-account',
    loadComponent: () => import('./pages/pix-account/pix-account.component').then(m => m.PixAccountComponent),
    canActivate: [authGuard]
  },
  {
    path: 'invite-validation',
    loadComponent: () => import('./pages/invite-validation/invite-validation.component').then(m => m.InviteValidationComponent),
    canActivate: [validateInviteGuard]
  },
  {
    path: 'blocked',
    loadComponent: () => import('./pages/blocked/blocked.component').then(m => m.BlockedComponent)
  },
  {
    path: 'dispute-management',
    loadComponent: () => import('./pages/dispute-management/dispute-management.component').then(m => m.DisputeManagementComponent),
    canActivate: [authGuard, managerGuard]
  },
  {
    path: 'dispute-details/:id',
    loadComponent: () => import('./pages/dispute-details/dispute-details.component').then(m => m.DisputeDetailsComponent),
    canActivate: [authGuard, managerGuard]
  },
  {
    path: 'send-invite',
    loadComponent: () => import('./pages/send-invite/send-invite.component').then(m => m.SendInviteComponent),
    canActivate: [authGuard, managerGuard]
  },
  {
    path: 'payment-requests',
    loadComponent: () => import('./pages/payment-requests/payment-requests.component').then(m => m.PaymentRequestsComponent),
    canActivate: [authGuard, managerGuard]
  },
  {
    path: 'send/sBTC',
    loadComponent: () => import('./pages/send-sbtc/send-sbtc.component').then(m => m.SendSBTCComponent),
    canActivate: [authGuard]
  },
  {
    path: 'wallet',
    loadComponent: () => import('./pages/wallet-management/wallet-management.component').then(m => m.WalletManagementComponent),
    canActivate: [authGuard]
  },
  {
    path: 'btc-to-sbtc',
    loadComponent: () => import('./pages/btc-sbtc-bridge/btc-to-sbtc.component').then(m => m.BtcToSbtcComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sbtc-to-btc',
    loadComponent: () => import('./pages/btc-sbtc-bridge/sbtc-to-btc.component').then(m => m.SbtcToBtcComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];

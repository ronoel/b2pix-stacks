import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { managerGuard } from './core/guards/manager.guard';
import { lpGuard } from './core/guards/lp.guard';
import { requireWalletOnlyGuard } from './core/guards/require-wallet-only.guard';
import { accountValidationGuard } from './core/guards/account-validation.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'buy',
    loadComponent: () => import('./pages/buy/buy.component').then(m => m.BuyComponent),
    canActivate: [authGuard, accountValidationGuard]
  },
  {
    path: 'buy/:id',
    loadComponent: () => import('./pages/buy-details/buy-details.component').then(m => m.BuyDetailsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'account-validation-required',
    loadComponent: () => import('./pages/account-validation-required/account-validation-required.component').then(m => m.AccountValidationRequiredComponent),
    canActivate: [requireWalletOnlyGuard]
  },
  {
    path: 'email-validation',
    loadComponent: () => import('./pages/email-validation/email-validation.component').then(m => m.EmailValidationComponent),
    canActivate: [requireWalletOnlyGuard]
  },
  {
    path: 'pix-validation',
    loadComponent: () => import('./pages/pix-validation/pix-validation.component').then(m => m.PixValidationComponent),
    canActivate: [requireWalletOnlyGuard]
  },
  {
    path: 'pix-payment',
    loadComponent: () => import('./pages/pix-payment/pix-payment.component').then(m => m.PixPaymentComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sell',
    loadComponent: () => import('./pages/sell/sell.component').then(m => m.SellComponent),
    canActivate: [authGuard, accountValidationGuard]
  },
  {
    path: 'sell/:id',
    loadComponent: () => import('./pages/sell/sell-details/sell-details.component').then(m => m.SellDetailsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pix-account',
    loadComponent: () => import('./pages/pix-account/pix-account.component').then(m => m.PixAccountComponent),
    canActivate: [authGuard]
  },
  {
    path: 'blocked',
    loadComponent: () => import('./pages/blocked/blocked.component').then(m => m.BlockedComponent)
  },
  {
    path: 'order-analysis',
    loadComponent: () => import('./pages/dispute-management/dispute-management.component').then(m => m.OrderAnalysisComponent),
    canActivate: [authGuard, managerGuard]
  },
  {
    path: 'analyzing-order/:id',
    loadComponent: () => import('./pages/dispute-details/dispute-details.component').then(m => m.AnalyzingOrderComponent),
    canActivate: [authGuard, managerGuard]
  },
  // Legacy routes for backward compatibility
  {
    path: 'dispute-management',
    redirectTo: 'order-analysis',
    pathMatch: 'full'
  },
  {
    path: 'dispute-details/:id',
    redirectTo: 'analyzing-order/:id',
    pathMatch: 'full'
  },
  {
    path: 'payment-requests',
    loadComponent: () => import('./pages/payment-requests/payment-requests.component').then(m => m.PaymentRequestsComponent),
    canActivate: [authGuard, managerGuard]
  },
  {
    path: 'pix-moderation',
    loadComponent: () => import('./pages/pix-moderation/pix-moderation.component').then(m => m.PixModerationComponent),
    canActivate: [authGuard, managerGuard]
  },
  {
    path: 'sell-order-management',
    loadComponent: () => import('./pages/sell-order-management/sell-order-management.component').then(m => m.SellOrderManagementComponent),
    canActivate: [authGuard, managerGuard]
  },
  {
    path: 'lp-register',
    loadComponent: () => import('./pages/lp-register/lp-register.component').then(m => m.LpRegisterComponent),
    canActivate: [authGuard]
  },
  {
    path: 'lp-dashboard',
    loadComponent: () => import('./pages/lp-dashboard/lp-dashboard.component').then(m => m.LpDashboardComponent),
    canActivate: [authGuard, lpGuard]
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

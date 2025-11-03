import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WalletService } from '../../libs/wallet.service';

@Component({
  selector: 'app-blocked',
  imports: [CommonModule],
  template: `
    <div class="blocked-page">
      <div class="container">
        <div class="blocked-content">
          <div class="blocked-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
          
          <h1 class="blocked-title">Acesso Bloqueado</h1>
          
          <p class="blocked-description">
            Sua conta foi bloqueada e você não tem acesso à plataforma B2Pix.
            Se você acredita que isso é um erro, entre em contato com o suporte.
          </p>
          
          <div class="blocked-actions">
            <button class="btn btn-secondary" (click)="goHome()">
              Voltar ao Início
            </button>
            <button class="btn btn-primary" (click)="contactSupport()">
              Contatar Suporte
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .blocked-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--background-primary);
      padding: var(--spacing-lg);
    }

    .blocked-content {
      text-align: center;
      max-width: 500px;
      background: var(--background-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-lg);
      padding: var(--spacing-2xl);
    }

    .blocked-icon {
      color: var(--danger-color);
      margin-bottom: var(--spacing-xl);
      display: flex;
      justify-content: center;
    }

    .blocked-title {
      font-size: var(--font-size-3xl);
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: var(--spacing-lg);
    }

    .blocked-description {
      font-size: var(--font-size-lg);
      color: var(--text-secondary);
      line-height: 1.6;
      margin-bottom: var(--spacing-2xl);
    }

    .blocked-actions {
      display: flex;
      gap: var(--spacing-md);
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      padding: var(--spacing-md) var(--spacing-lg);
      font-weight: 600;
      min-width: 140px;
    }

    @media (max-width: 480px) {
      .blocked-actions {
        flex-direction: column;
        width: 100%;
      }
      
      .btn {
        width: 100%;
      }
    }
  `]
})
export class BlockedComponent {
  private router = inject(Router);
  private walletService = inject(WalletService);

  goHome() {
    // Sign out user and redirect to home
    this.walletService.signOut();
    this.router.navigate(['/']);
  }

  contactSupport() {
    // This could open a support form, email, or external support system
    window.open('mailto:support@b2pix.com?subject=Conta%20Bloqueada', '_blank');
  }
}

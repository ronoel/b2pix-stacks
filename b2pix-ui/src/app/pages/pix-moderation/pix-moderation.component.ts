import { Component, inject, OnInit, ViewEncapsulation, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { AccountPixVerify, PixResolution } from '../../shared/models/account-validation.model';
import { PixModerationCardComponent } from './components/pix-moderation-card.component';

@Component({
  selector: 'app-pix-moderation',
  standalone: true,
  imports: [PixModerationCardComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="pix-moderation">
      <div class="container">
        <!-- Header -->
        <div class="page-header">
          <button class="btn btn-ghost" (click)="goBack()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Voltar
          </button>
          <div class="header-content">
            <h1 class="page-title">Validacao PIX</h1>
            <p class="page-subtitle">Analise e aprove verificacoes PIX pendentes</p>
          </div>
        </div>

        @if (loading()) {
          <!-- Loading State -->
          <div class="loading-section">
            <div class="loading-spinner"></div>
            <p>Carregando verificacoes...</p>
          </div>
        } @else if (error()) {
          <!-- Error State -->
          <div class="error-state">
            <div class="error-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <h2>Erro ao carregar verificacoes</h2>
            <p>{{ error() }}</p>
            <button class="retry-button" (click)="loadProcessingVerifications()">Tentar Novamente</button>
          </div>
        } @else if (processingVerifications().length === 0) {
          <!-- Empty State -->
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <h2>Nenhuma verificacao pendente</h2>
            <p>Nao ha verificacoes PIX pendentes de analise no momento.</p>
          </div>
        } @else {
          <!-- Verifications List -->
          <div class="verifications-list">
            <div class="verifications-header">
              <h2>Verificacoes Pendentes ({{ processingVerifications().length }})</h2>
              <button class="btn btn-outline btn-sm" (click)="loadProcessingVerifications()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 12C3 7.02944 7.02944 3 12 3C14.5755 3 16.9 4.15205 18.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M21 12C21 16.9706 16.9706 21 12 21C9.42446 21 7.09995 19.848 5.5 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M13 2L18 6L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M11 22L6 18L10 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Atualizar
              </button>
            </div>

            <div class="verification-cards">
              @for (verification of processingVerifications(); track verification.address) {
                <app-pix-moderation-card
                  [verification]="verification"
                  [isProcessing]="processingAddress() === verification.address"
                  (approve)="onApprove($event)"
                  (reject)="onReject($event)"
                />
              }
            </div>
          </div>
        }

        <!-- Success/Error Toast -->
        @if (toastMessage()) {
          <div class="toast" [class.success]="toastType() === 'success'" [class.error]="toastType() === 'error'">
            @if (toastType() === 'success') {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              </svg>
            } @else {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
              </svg>
            }
            <span>{{ toastMessage() }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    /* Container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 16px;
    }

    .pix-moderation {
      min-height: 100vh;
      background: #F8FAFC;
      padding: 32px 0;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px 0;
      margin-bottom: 32px;
    }

    .header-content {
      flex: 1;
    }

    .page-title {
      font-size: 30px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 8px 0;
    }

    .page-subtitle {
      font-size: 16px;
      color: #6B7280;
      margin: 0;
    }

    /* Common Button Styles */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-ghost {
      background: transparent;
      color: #6B7280;
      border: none;
    }

    .btn-ghost:hover:not(:disabled) {
      background: #F3F4F6;
      color: #374151;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid #E5E7EB;
      color: #374151;
    }

    .btn-outline:hover:not(:disabled) {
      background: #F3F4F6;
      border-color: #D1D5DB;
    }

    .btn-sm {
      padding: 8px 16px;
      font-size: 13px;
    }

    /* Loading State */
    .loading-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 0;
      text-align: center;
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #E5E7EB;
      border-top: 4px solid #F59E0B;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 0;
      text-align: center;
    }

    .empty-icon {
      color: #9CA3AF;
      margin-bottom: 24px;
    }

    .empty-state h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 12px 0;
    }

    .empty-state p {
      font-size: 16px;
      color: #6B7280;
      margin: 0;
    }

    /* Error State */
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 0;
      text-align: center;
    }

    .error-icon {
      color: #DC2626;
      margin-bottom: 24px;
    }

    .error-state h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 12px 0;
    }

    .error-state p {
      font-size: 16px;
      color: #6B7280;
      margin: 0 0 24px 0;
    }

    .retry-button {
      padding: 12px 24px;
      background: #F59E0B;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .retry-button:hover {
      background: #D97706;
      transform: translateY(-1px);
    }

    /* Verifications List */
    .verifications-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .verifications-header h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }

    .verification-cards {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 10px 25px -3px rgb(0 0 0 / 0.1);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    }

    .toast.success {
      background: #D1FAE5;
      color: #065F46;
      border: 1px solid #6EE7B7;
    }

    .toast.error {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FCA5A5;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .pix-moderation {
        padding: 24px 0;
      }

      .container {
        padding: 0 12px;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .page-title {
        font-size: 28px;
      }

      .page-subtitle {
        font-size: 14px;
      }

      .verifications-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .toast {
        left: 16px;
        right: 16px;
        bottom: 16px;
      }
    }

    @media (max-width: 480px) {
      .pix-moderation {
        padding: 16px 0;
      }

      .container {
        padding: 0 8px;
      }

      .page-title {
        font-size: 24px;
      }
    }
  `]
})
export class PixModerationComponent implements OnInit {
  private router = inject(Router);
  private accountValidationService = inject(AccountValidationService);

  // Signals
  processingVerifications = signal<AccountPixVerify[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  processingAddress = signal<string | null>(null);

  // Toast
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');

  ngOnInit() {
    this.loadProcessingVerifications();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  loadProcessingVerifications() {
    this.loading.set(true);
    this.error.set(null);

    this.accountValidationService.getProcessingPixVerifications().subscribe({
      next: (verifications) => {
        this.processingVerifications.set(verifications);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading processing verifications:', error);
        this.error.set('Erro ao carregar verificacoes pendentes. Tente novamente.');
        this.loading.set(false);
      }
    });
  }

  onApprove(address: string) {
    this.resolveVerification(address, 'verified');
  }

  onReject(address: string) {
    this.resolveVerification(address, 'failed');
  }

  private resolveVerification(address: string, resolution: PixResolution) {
    this.processingAddress.set(address);

    this.accountValidationService.resolvePixVerification(address, resolution).subscribe({
      next: () => {
        // Remove from list
        const current = this.processingVerifications();
        this.processingVerifications.set(current.filter(v => v.address !== address));
        this.processingAddress.set(null);

        // Show success toast
        const message = resolution === 'verified'
          ? 'Verificacao aprovada com sucesso!'
          : 'Verificacao rejeitada com sucesso!';
        this.showToast(message, 'success');
      },
      error: (error) => {
        console.error('Error resolving verification:', error);
        this.processingAddress.set(null);
        this.showToast(error.message || 'Erro ao processar verificacao', 'error');
      }
    });
  }

  private showToast(message: string, type: 'success' | 'error') {
    this.toastMessage.set(message);
    this.toastType.set(type);

    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }
}

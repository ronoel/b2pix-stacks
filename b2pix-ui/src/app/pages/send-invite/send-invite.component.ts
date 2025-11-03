import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InvitesService, SendInviteResponse } from '../../shared/api/invites.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-send-invite',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="send-invite-page">
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
            <h1 class="page-title">Enviar Convite</h1>
            <p class="page-subtitle">Convide novos usuários para a plataforma B2PIX</p>
          </div>
        </div>

        <!-- Main Content -->
        <div class="send-invite-content">
          @if (inviteSent()) {
            <!-- Success Message -->
            <div class="success-card">
              <div class="success-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#10B981" stroke-width="2"/>
                  <path d="M8 12L11 15L16 9" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h2>Convite Enviado com Sucesso!</h2>
              <p>O convite foi enviado para <strong>{{ emailInput() }}</strong></p>
              <button class="btn btn-primary" (click)="resetForm()">
                Enviar Outro Convite
              </button>
            </div>
          } @else {
            <!-- Invite Form -->
            <div class="invite-form-card">
              <div class="form-section">
                <h2 class="form-title">Informações do Convite</h2>
                <p class="form-description">
                  Digite o endereço de e-mail da pessoa que você deseja convidar.
                  Um convite será enviado permitindo o acesso à plataforma.
                </p>

                <div class="form-group">
                  <label for="email">E-mail do Convidado</label>
                  <input
                    type="email"
                    id="email"
                    [(ngModel)]="emailInput"
                    [disabled]="isProcessing()"
                    placeholder="exemplo@email.com"
                    class="form-input"
                    (keyup.enter)="sendInvite()"
                  >
                  @if (errorMessage()) {
                    <div class="error-message">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <circle cx="12" cy="16" r="1" fill="currentColor"/>
                      </svg>
                      {{ errorMessage() }}
                    </div>
                  }
                </div>

                <div class="info-box">
                  <div class="info-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <circle cx="12" cy="8" r="1" fill="currentColor"/>
                    </svg>
                  </div>
                  <div class="info-content">
                    <h4>Importante</h4>
                    <p>O convidado receberá um e-mail com instruções para se registrar na plataforma.</p>
                  </div>
                </div>

                <button
                  class="btn btn-primary btn-send"
                  [disabled]="!isValidEmail() || isProcessing()"
                  (click)="sendInvite()"
                >
                  @if (isProcessing()) {
                    <span class="spinner"></span>
                    Enviando...
                  } @else {
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Enviar Convite
                  }
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .send-invite-page {
      min-height: 100vh;
      background: linear-gradient(to bottom, #F8FAFC 0%, #EFF6FF 100%);
      padding: 2rem 1rem 4rem;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .btn-ghost {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      color: #64748B;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }

    .btn-ghost:hover {
      background: rgba(100, 116, 139, 0.1);
      color: #334155;
    }

    .header-content {
      text-align: center;
    }

    .page-title {
      font-size: 2rem;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 0.5rem;
    }

    .page-subtitle {
      font-size: 1rem;
      color: #64748B;
    }

    .send-invite-content {
      margin-top: 2rem;
    }

    .invite-form-card,
    .success-card {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      padding: 2rem;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #0F172A;
      margin: 0;
    }

    .form-description {
      font-size: 0.875rem;
      color: #64748B;
      line-height: 1.5;
      margin: 0;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #334155;
    }

    .form-input {
      padding: 0.75rem 1rem;
      border: 2px solid #E2E8F0;
      border-radius: 0.5rem;
      font-size: 1rem;
      color: #0F172A;
      transition: all 0.2s;
      background: white;
    }

    .form-input:focus {
      outline: none;
      border-color: #3B82F6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-input:disabled {
      background: #F1F5F9;
      cursor: not-allowed;
    }

    .form-input::placeholder {
      color: #94A3B8;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: #FEF2F2;
      border: 1px solid #FEE2E2;
      border-radius: 0.5rem;
      color: #DC2626;
      font-size: 0.875rem;
    }

    .error-message svg {
      flex-shrink: 0;
    }

    .info-box {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: #F0F9FF;
      border: 1px solid #DBEAFE;
      border-radius: 0.5rem;
    }

    .info-icon {
      color: #3B82F6;
      flex-shrink: 0;
    }

    .info-content h4 {
      font-size: 0.875rem;
      font-weight: 600;
      color: #1E40AF;
      margin: 0 0 0.25rem 0;
    }

    .info-content p {
      font-size: 0.875rem;
      color: #1E40AF;
      margin: 0;
      line-height: 1.5;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
    }

    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-send {
      width: 100%;
      margin-top: 0.5rem;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Success Card */
    .success-card {
      text-align: center;
      padding: 3rem 2rem;
    }

    .success-icon {
      margin: 0 auto 1.5rem;
      display: flex;
      justify-content: center;
    }

    .success-card h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 0.5rem 0;
    }

    .success-card p {
      font-size: 1rem;
      color: #64748B;
      margin: 0 0 2rem 0;
    }

    .success-card p strong {
      color: #10B981;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .send-invite-page {
        padding: 1rem 1rem 3rem;
      }

      .page-title {
        font-size: 1.5rem;
      }

      .invite-form-card,
      .success-card {
        padding: 1.5rem;
      }

      .success-card {
        padding: 2rem 1.5rem;
      }
    }
  `]
})
export class SendInviteComponent {
  private router = inject(Router);
  private invitesService = inject(InvitesService);
  private loadingService = inject(LoadingService);

  emailInput = signal<string>('');
  isProcessing = signal<boolean>(false);
  inviteSent = signal<boolean>(false);
  errorMessage = signal<string>('');

  isValidEmail(): boolean {
    const email = this.emailInput();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  sendInvite(): void {
    if (!this.isValidEmail() || this.isProcessing()) {
      return;
    }

    this.errorMessage.set('');
    this.isProcessing.set(true);
    this.loadingService.show();

    this.invitesService.sendInvite(this.emailInput()).subscribe({
      next: (response: SendInviteResponse) => {
        this.isProcessing.set(false);
        this.loadingService.hide();
        this.inviteSent.set(true);
      },
      error: (error) => {
        console.error('Error sending invite:', error);
        this.isProcessing.set(false);
        this.loadingService.hide();

        if (error.status === 400) {
          this.errorMessage.set('E-mail inválido ou já convidado.');
        } else if (error.status === 429) {
          this.errorMessage.set('Muitas tentativas. Tente novamente mais tarde.');
        } else {
          this.errorMessage.set('Erro ao enviar convite. Tente novamente.');
        }
      }
    });
  }

  resetForm(): void {
    this.emailInput.set('');
    this.inviteSent.set(false);
    this.errorMessage.set('');
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
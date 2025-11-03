import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InvitesService } from '../../shared/api/invites.service';

@Component({
  selector: 'app-invite-validation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="invite-validation-page">
      <div class="container-sm">
        <!-- Logo/Header -->
        <div class="brand-header">
          <div class="brand-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2"/>
              <path d="M12 7V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h1 class="brand-title">B2PIX</h1>
          <p class="brand-subtitle">Validação de Convite</p>
        </div>

        <!-- Validation Form Card -->
        <div class="validation-card">
          <div class="form-section">
            <h2 class="form-title">Bem-vindo à Plataforma</h2>
            <p class="form-description">
              Insira o código do convite que você recebeu e escolha seu nome de usuário para começar.
            </p>

            <form (ngSubmit)="submit()">
              <div class="form-group">
                <label for="inviteCode">Código do Convite</label>
                <input
                  type="text"
                  id="inviteCode"
                  name="inviteCode"
                  [(ngModel)]="inviteCode"
                  [disabled]="loading()"
                  placeholder="Digite o código recebido"
                  class="form-input"
                  autocomplete="off"
                  required
                >
              </div>

              <div class="form-group">
                <label for="username">Nome de Usuário</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  [(ngModel)]="username"
                  (input)="onUsernameChange()"
                  [disabled]="loading()"
                  [class.input-error]="usernameError()"
                  placeholder="Ex: joao_silva123"
                  class="form-input"
                  autocomplete="off"
                  required
                >
                @if (usernameError()) {
                  <div class="error-message">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      <circle cx="12" cy="16" r="1" fill="currentColor"/>
                    </svg>
                    {{ usernameError() }}
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
                  <h4>Dicas para o nome de usuário</h4>
                  <ul>
                    <li>Mínimo de 3 caracteres, máximo de 20</li>
                    <li>Use apenas letras, números, _ ou -</li>
                    <li>Deve começar com uma letra</li>
                  </ul>
                </div>
              </div>

              @if (error()) {
                <div class="alert-error">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                  </svg>
                  {{ error() }}
                </div>
              }

              <button
                type="submit"
                class="btn btn-primary btn-submit"
                [disabled]="loading() || !inviteCode || !username || !!usernameError()"
              >
                @if (loading()) {
                  <span class="spinner"></span>
                  Validando...
                } @else {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13L9 17L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Validar e Entrar
                }
              </button>
            </form>
          </div>
        </div>

        <!-- Footer -->
        <div class="page-footer">
          <p>Não tem um convite? Entre em contato com o suporte.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .invite-validation-page {
      min-height: 100vh;
      background: linear-gradient(to bottom, #F8FAFC 0%, #EFF6FF 100%);
      padding: 2rem 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .container-sm {
      max-width: 500px;
      width: 100%;
      margin: 0 auto;
    }

    .brand-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .brand-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
      border-radius: 1rem;
      color: white;
      margin-bottom: 1rem;
      box-shadow: 0 4px 14px rgba(30, 64, 175, 0.2);
    }

    .brand-title {
      font-size: 2rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.5px;
    }

    .brand-subtitle {
      font-size: 1rem;
      color: #64748B;
      margin: 0;
    }

    .validation-card {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      padding: 2rem;
      border: 1px solid #E2E8F0;
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
      color: #94A3B8;
    }

    .form-input.input-error {
      border-color: #DC2626;
      background: #FEF2F2;
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
      margin: 0 0 0.5rem 0;
    }

    .info-content ul {
      margin: 0;
      padding-left: 1.25rem;
      color: #1E40AF;
      font-size: 0.875rem;
      line-height: 1.6;
    }

    .info-content li {
      margin-bottom: 0.25rem;
    }

    .info-content li:last-child {
      margin-bottom: 0;
    }

    .alert-error {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: #FEF2F2;
      border: 1px solid #FEE2E2;
      border-radius: 0.5rem;
      color: #DC2626;
      font-size: 0.875rem;
      font-weight: 500;
      animation: shake 0.5s ease;
    }

    .alert-error svg {
      flex-shrink: 0;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(30, 64, 175, 0.2);
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(30, 64, 175, 0.3);
    }

    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-submit {
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

    .page-footer {
      text-align: center;
      margin-top: 2rem;
      padding: 1rem;
    }

    .page-footer p {
      font-size: 0.875rem;
      color: #64748B;
      margin: 0;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .invite-validation-page {
        padding: 1.5rem 1rem;
      }

      .brand-icon {
        width: 56px;
        height: 56px;
      }

      .brand-title {
        font-size: 1.75rem;
      }

      .validation-card {
        padding: 1.5rem;
      }

      .form-title {
        font-size: 1.25rem;
      }
    }
  `]
})
export class InviteValidationComponent {
  private router = inject(Router);
  private invitesService = inject(InvitesService);
  
  inviteCode = '';
  username = '';
  loading = signal(false);
  error = signal('');
  usernameError = signal('');

  validateUsername(username: string): boolean {
    // Reset error
    this.usernameError.set('');
    
    if (!username) {
      this.usernameError.set('Nome de usuário é obrigatório');
      return false;
    }
    
    if (username.length < 3) {
      this.usernameError.set('Nome de usuário deve ter pelo menos 3 caracteres');
      return false;
    }
    
    if (username.length > 20) {
      this.usernameError.set('Nome de usuário deve ter no máximo 20 caracteres');
      return false;
    }
    
    // Only allow letters, numbers, underscore and hyphen
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      this.usernameError.set('Nome de usuário pode conter apenas letras, números, _ e -');
      return false;
    }
    
    // Cannot start with number or special character
    if (/^[0-9_-]/.test(username)) {
      this.usernameError.set('Nome de usuário deve começar com uma letra');
      return false;
    }
    
    return true;
  }

  onUsernameChange() {
    this.validateUsername(this.username);
  }

  submit() {
    if (!this.inviteCode || !this.username) return;
    
    // Validate username before submitting
    if (!this.validateUsername(this.username)) {
      return;
    }
    
    this.loading.set(true);
    this.error.set('');
    
    this.invitesService.claimInvite(this.inviteCode, this.username).subscribe({
      next: (response) => {
        
        if (response && response.status === 'claimed') {
          // Success: redirect to dashboard
          this.router.navigate(['/dashboard']);
        } else {
          this.error.set('Código de convite já foi usado ou não existe.');
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error claiming invite:', error);
        if (error.status === 409) {
          this.error.set('Nome de usuário já existe. Tente outro nome de usuário.');
        } else {
          this.error.set(`${error.status} - ${error.error}.`);
        }
        this.loading.set(false);
      }
    });
  }
} 
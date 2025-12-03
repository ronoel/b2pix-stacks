import { Component, inject, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { LoadingService } from '../../services/loading.service';
import { InviteRequest, InviteResponse } from '../../interfaces/user.interface';

@Component({
  selector: 'app-request-invite',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="request-page">
      <div class="container">
        <!-- Header -->
        <div class="page-header">
          <button class="btn btn-outline back-btn" (click)="goBack()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Voltar
          </button>
          <div class="header-content">
            <h1 class="page-title">Solicitar Acesso</h1>
            <p class="page-subtitle">Preencha seus dados para solicitar acesso à plataforma</p>
          </div>
        </div>

        @if (!requestSent) {
          <!-- Request Form -->
          <div class="form-section">
            <div class="form-card">
              <!-- Form Header -->
              <div class="form-header">
                <div class="form-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H4C2.93913 15 1.92172 15.4214 1.17157 16.1716C0.421427 16.9217 0 17.9391 0 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="8" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                    <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" stroke-width="2"/>
                    <line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </div>
                <h2>Informações Pessoais</h2>
                <p>Precisamos destes dados para verificar sua identidade</p>
              </div>

              <form (ngSubmit)="onSubmit()" #form="ngForm">
                <div class="form-grid">
                  <div class="form-group">
                    <label for="username">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      Nome de usuário
                    </label>
                    <input
                      id="username"
                      type="text"
                      [(ngModel)]="request.username"
                      name="username"
                      required
                      minlength="3"
                      placeholder="Ex: joaosilva"
                      class="form-input"
                      #username="ngModel">
                    @if (username.invalid && username.touched) {
                      <div class="error-message">
                        @if (username.errors?.['required']) {
                          Nome de usuário é obrigatório
                        }
                        @if (username.errors?.['minlength']) {
                          Nome deve ter pelo menos 3 caracteres
                        }
                      </div>
                    }
                  </div>

                  <div class="form-group">
                    <label for="email">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      [(ngModel)]="request.email"
                      name="email"
                      required
                      placeholder="seu@email.com"
                      class="form-input"
                      #email="ngModel">
                    @if (email.invalid && email.touched) {
                      <div class="error-message">
                        @if (email.errors?.['required']) {
                          Email é obrigatório
                        }
                        @if (email.errors?.['email']) {
                          Email deve ter um formato válido
                        }
                      </div>
                    }
                  </div>
                </div>

                <div class="form-group">
                  <label for="referralCode">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M16.5 9.4L7.55 4.24C7.21 4.09 6.81 4.23 6.61 4.55L1.04 12L6.61 19.45C6.81 19.77 7.21 19.91 7.55 19.76L16.5 14.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <polyline points="10.5,15.5 15.5,12 10.5,8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Código de Indicação (opcional)
                  </label>
                  <input
                    id="referralCode"
                    type="text"
                    [(ngModel)]="request.referralCode"
                    name="referralCode"
                    placeholder="Código fornecido por um usuário existente"
                    class="form-input"
                    #referralCode="ngModel">
                  <div class="input-help">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M12 17H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Ter um código de indicação acelera o processo de aprovação
                  </div>
                </div>

                <!-- Wallet Info -->
                <div class="wallet-info-section">
                  <div class="wallet-header">
                    <div class="wallet-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M19 7V6C19 5.46957 18.7893 4.96086 18.4142 4.58579C18.0391 4.21071 17.5304 4 17 4H5C4.46957 4 3.96086 4.21071 3.58579 4.58579C3.21071 4.96086 3 5.46957 3 6V18C3 18.5304 3.21071 19.0391 3.58579 19.4142C3.96086 19.7893 4.46957 20 5 20H17C17.5304 20 18.0391 19.7893 18.4142 19.4142C18.7893 19.0391 19 18.5304 19 18V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="15.5" cy="11.5" r="2.5" stroke="currentColor" stroke-width="2"/>
                        <path d="M13 11.5H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <h3>Carteira Bitcoin Conectada</h3>
                    <p>Sua carteira foi conectada com sucesso</p>
                  </div>
                  
                  @if (walletAddress) {
                    <div class="wallet-details">
                      <div class="wallet-item">
                        <div class="wallet-label">Endereço da Carteira</div>
                        <div class="wallet-value">{{ formatWalletAddress(walletAddress) }}</div>
                      </div>
                      <div class="wallet-item">
                        <div class="wallet-label">Status</div>
                        <div class="wallet-status connected">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M9 11L12 14L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 20.5304 3 20V9C3 8.46957 3.21071 7.96086 3.58579 7.58579C3.96086 7.21071 4.46957 7 5 7H13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                          Conectada
                        </div>
                      </div>
                    </div>
                  } @else {
                    <div class="wallet-missing">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                      </svg>
                      <p>Nenhuma carteira conectada</p>
                      <button type="button" class="btn btn-outline btn-sm" (click)="goToConnectWallet()">
                        Conectar Carteira
                      </button>
                    </div>
                  }
                </div>

                <!-- Terms -->
                <div class="terms-section">
                  <label class="checkbox-wrapper">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="termsAccepted" 
                      name="terms" 
                      required
                    >
                    <div class="checkbox-custom">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <span>Aceito os <a href="#" (click)="showTerms($event)">termos e condições</a> e a <a href="#" (click)="showPrivacy($event)">política de privacidade</a></span>
                  </label>
                </div>

                <!-- Form Actions -->
                <div class="form-actions">
                  <button type="button" class="btn btn-outline" (click)="goBack()">
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    class="btn btn-primary"
                    [disabled]="form.invalid || !walletAddress || !termsAccepted || loadingService.getIsLoading()()">
                    @if (loadingService.getIsLoading()()) {
                      <div class="btn-loading"></div>
                      Enviando...
                    } @else {
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      Solicitar Acesso
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        } @else {
          <!-- Success Section -->
          <div class="success-section">
            <div class="success-card">
              <div class="success-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <path d="M9 11L12 14L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 20.5304 3 20V9C3 8.46957 3.21071 7.96086 3.58579 7.58579C3.96086 7.21071 4.46957 7 5 7H13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              
              <div class="success-content">
                <h2>Solicitação enviada!</h2>
                <p>Sua solicitação foi enviada com sucesso. Você receberá um email quando for aprovado.</p>
                
                <div class="invite-info">
                  <h3>Seu código de convite:</h3>
                  <div class="invite-code">
                    <code>{{ inviteCode }}</code>
                    <button class="copy-btn" (click)="copyInviteCode()">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="next-steps">
                  <h3>Próximos passos:</h3>
                  <div class="steps-list">
                    <div class="step-item">
                      <div class="step-icon">1</div>
                      <p>Entre em contato com alguém que já tenha acesso à plataforma</p>
                    </div>
                    <div class="step-item">
                      <div class="step-icon">2</div>
                      <p>Compartilhe seu código de convite: <strong>{{ inviteCode }}</strong></p>
                    </div>
                    <div class="step-item">
                      <div class="step-icon">3</div>
                      <p>Aguarde a aprovação - você será notificado por email</p>
                    </div>
                  </div>
                </div>

                <div class="success-actions">
                  <button class="btn btn-outline" (click)="goToLanding()">
                    Voltar ao Início
                  </button>
                  <button class="btn btn-primary" (click)="goToPendingApproval()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Acompanhar Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .request-page {
      min-height: 100vh;
      background: var(--background-dark);
      padding: var(--spacing-xl) 0;
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-2xl);
    }

    .back-btn {
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-sm);
    }

    .header-content {
      flex: 1;
    }

    .page-title {
      font-size: var(--font-size-3xl);
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-xs) 0;
    }

    .page-subtitle {
      font-size: var(--font-size-md);
      color: var(--text-secondary);
      margin: 0;
    }

    /* Form Section */
    .form-section {
      display: flex;
      justify-content: center;
    }

    .form-card {
      max-width: 600px;
      width: 100%;
      padding: var(--spacing-2xl);
      background: var(--background-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-lg);
    }

    .form-header {
      text-align: center;
      margin-bottom: var(--spacing-2xl);
    }

    .form-icon {
      color: var(--primary-blue);
      margin-bottom: var(--spacing-lg);
    }

    .form-header h2 {
      font-size: var(--font-size-2xl);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-sm) 0;
    }

    .form-header p {
      color: var(--text-secondary);
      margin: 0;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-lg);
    }

    .form-group {
      margin-bottom: var(--spacing-lg);
    }

    .form-group label {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: var(--spacing-xs);
    }

    .form-input {
      width: 100%;
      padding: var(--spacing-md);
      background: var(--background-elevated);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      color: var(--text-primary);
      font-size: var(--font-size-md);
      transition: border-color var(--transition-normal);
    }

    .form-input:focus {
      border-color: var(--primary-orange);
      outline: none;
    }

    .error-message {
      color: var(--error-red);
      font-size: var(--font-size-xs);
      margin-top: var(--spacing-xs);
    }

    .input-help {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      margin-top: var(--spacing-xs);
    }

    /* Wallet Info Section */
    .wallet-info-section {
      padding: var(--spacing-lg);
      background: var(--background-elevated);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      margin-bottom: var(--spacing-lg);
    }

    .wallet-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-lg);
      text-align: center;
    }

    .wallet-icon {
      color: var(--success-green);
    }

    .wallet-header h3 {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .wallet-header p {
      color: var(--text-secondary);
      margin: 0;
      font-size: var(--font-size-sm);
    }

    .wallet-details {
      display: grid;
      gap: var(--spacing-md);
    }

    .wallet-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-sm) 0;
      border-bottom: 1px solid var(--border-color);
    }

    .wallet-item:last-child {
      border-bottom: none;
    }

    .wallet-label {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }

    .wallet-value {
      color: var(--text-primary);
      font-weight: 500;
      font-family: 'Courier New', monospace;
      font-size: var(--font-size-sm);
    }

    .wallet-status.connected {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      color: var(--success-green);
      font-weight: 500;
      font-size: var(--font-size-sm);
    }

    .wallet-missing {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-md);
      text-align: center;
      color: var(--text-muted);
    }

    .wallet-missing p {
      margin: 0;
    }

    /* Terms Section */
    .terms-section {
      margin-bottom: var(--spacing-lg);
    }

    .checkbox-wrapper {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-md);
      cursor: pointer;
      line-height: 1.5;
    }

    .checkbox-wrapper input[type="checkbox"] {
      display: none;
    }

    .checkbox-custom {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border: 2px solid var(--border-color);
      border-radius: var(--border-radius-sm);
      background: var(--background-elevated);
      transition: all var(--transition-normal);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .checkbox-custom svg {
      opacity: 0;
      transform: scale(0.8);
      transition: all var(--transition-normal);
    }

    .checkbox-wrapper input[type="checkbox"]:checked + .checkbox-custom {
      background: var(--primary-orange);
      border-color: var(--primary-orange);
    }

    .checkbox-wrapper input[type="checkbox"]:checked + .checkbox-custom svg {
      opacity: 1;
      transform: scale(1);
      color: white;
    }

    .checkbox-wrapper span {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }

    .checkbox-wrapper a {
      color: var(--primary-orange);
      text-decoration: none;
    }

    .checkbox-wrapper a:hover {
      text-decoration: underline;
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      gap: var(--spacing-md);
      justify-content: flex-end;
    }

    .btn-loading {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Success Section */
    .success-section {
      display: flex;
      justify-content: center;
    }

    .success-card {
      max-width: 600px;
      width: 100%;
      padding: var(--spacing-2xl);
      background: var(--background-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-lg);
      border-left: 4px solid var(--success-green);
      text-align: center;
    }

    .success-icon {
      color: var(--success-green);
      margin-bottom: var(--spacing-lg);
    }

    .success-content h2 {
      font-size: var(--font-size-2xl);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-sm) 0;
    }

    .success-content > p {
      color: var(--text-secondary);
      margin: 0 0 var(--spacing-xl) 0;
      font-size: var(--font-size-lg);
    }

    .invite-info {
      margin-bottom: var(--spacing-xl);
    }

    .invite-info h3 {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }

    .invite-code {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: var(--background-elevated);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-md);
      justify-content: center;
    }

    .invite-code code {
      font-family: 'Courier New', monospace;
      font-size: var(--font-size-lg);
      font-weight: 700;
      color: var(--primary-orange);
      background: none;
      padding: 0;
    }

    .copy-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: var(--primary-orange);
      color: white;
      border: none;
      border-radius: var(--border-radius-sm);
      cursor: pointer;
      transition: background var(--transition-normal);
    }

    .copy-btn:hover {
      background: var(--primary-orange-dark);
    }

    .next-steps {
      margin-bottom: var(--spacing-xl);
      text-align: left;
    }

    .next-steps h3 {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
      text-align: center;
    }

    .steps-list {
      display: grid;
      gap: var(--spacing-md);
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-md);
    }

    .step-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: var(--primary-orange);
      color: white;
      border-radius: 50%;
      font-size: var(--font-size-xs);
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .step-item p {
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    .step-item strong {
      color: var(--primary-orange);
    }

    .success-actions {
      display: flex;
      gap: var(--spacing-md);
      justify-content: center;
    }

    /* Responsividade */
    @media (max-width: 768px) {
      .request-page {
        padding: var(--spacing-lg) 0;
      }

      .page-header {
        flex-direction: column;
        gap: var(--spacing-md);
      }

      .form-card,
      .success-card {
        padding: var(--spacing-lg);
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .form-actions,
      .success-actions {
        flex-direction: column;
      }

      .wallet-item {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-xs);
      }
    }

    @media (max-width: 480px) {
      .invite-code {
        flex-direction: column;
        gap: var(--spacing-md);
      }

      .invite-code code {
        font-size: var(--font-size-md);
        word-break: break-all;
      }
    }
  `]
})
export class RequestInviteComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  protected loadingService = inject(LoadingService);

  request: InviteRequest = {
    username: '',
    email: '',
    referralCode: ''
  };

  walletAddress = '';
  termsAccepted = false;
  requestSent = false;
  inviteCode = '';

  ngOnInit() {
    // Verificar se há um wallet conectado
    const user = this.userService.getCurrentUser()();
    if (user && user.wallet) {
      this.walletAddress = user.wallet;
    }

    // Verificar se há código de referência na URL
    this.route.queryParams.subscribe(params => {
      if (params['ref']) {
        this.request.referralCode = params['ref'];
      }
    });
  }

  formatWalletAddress(address: string): string {
    if (!address) return '';
    if (address.length <= 20) return address;
    return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
  }

  onSubmit() {
    if (!this.walletAddress) {
      alert('É necessário conectar uma carteira Bitcoin primeiro.');
      return;
    }

    this.userService.requestInvite(this.request).subscribe({
      next: (response: InviteResponse) => {
        this.requestSent = true;
        this.inviteCode = response.inviteCode;
      },
      error: (error: any) => {
        console.error('Erro ao enviar solicitação:', error);
        alert('Erro ao enviar solicitação. Tente novamente.');
      }
    });
  }

  copyInviteCode() {
    navigator.clipboard.writeText(this.inviteCode).then(() => {
      alert('Código copiado para a área de transferência!');
    }).catch(() => {
      alert('Erro ao copiar código');
    });
  }

  showTerms(event: Event) {
    event.preventDefault();
    alert('Termos e condições seriam exibidos aqui...');
  }

  showPrivacy(event: Event) {
    event.preventDefault();
    alert('Política de privacidade seria exibida aqui...');
  }

  goToConnectWallet() {
    this.router.navigate(['/']);
  }

  goToPendingApproval() {
    this.router.navigate(['/pending-approval']);
  }

  goToLanding() {
    this.router.navigate(['/']);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}

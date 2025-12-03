import { Component, inject, OnInit } from '@angular/core';

import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-pending-approval',
  standalone: true,
  imports: [],
  template: `
    <div class="pending-page">
      <div class="container">
        <!-- Main Content -->
        <div class="pending-section">
          <div class="pending-card">
            <!-- Status Icon -->
            <div class="status-header">
              <div class="status-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h1>Solicitação em Análise</h1>
              <p>Estamos verificando seus dados e credenciais</p>
            </div>

            @if (currentUser()) {
              <!-- User Information -->
              <div class="user-info-section">
                <h2>Dados Enviados</h2>
                
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                      </svg>
                    </div>
                    <div class="info-content">
                      <div class="info-label">Nome de Usuário</div>
                      <div class="info-value">{{ currentUser()!.username }}</div>
                    </div>
                  </div>

                  <div class="info-item">
                    <div class="info-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <div class="info-content">
                      <div class="info-label">Email</div>
                      <div class="info-value">{{ currentUser()!.email }}</div>
                    </div>
                  </div>

                  <div class="info-item">
                    <div class="info-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M19 7V6C19 5.46957 18.7893 4.96086 18.4142 4.58579C18.0391 4.21071 17.5304 4 17 4H5C4.46957 4 3.96086 4.21071 3.58579 4.58579C3.21071 4.96086 3 5.46957 3 6V18C3 18.5304 3.21071 19.0391 3.58579 19.4142C3.96086 19.7893 4.46957 20 5 20H17C17.5304 20 18.0391 19.7893 18.4142 19.4142C18.7893 19.0391 19 18.5304 19 18V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="15.5" cy="11.5" r="2.5" stroke="currentColor" stroke-width="2"/>
                        <path d="M13 11.5H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <div class="info-content">
                      <div class="info-label">Carteira Bitcoin</div>
                      <div class="info-value wallet">{{ formatWalletAddress(currentUser()!.wallet) }}</div>
                    </div>
                  </div>

                  <div class="info-item">
                    <div class="info-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <div class="info-content">
                      <div class="info-label">Status</div>
                      <div class="info-value status">
                        <span class="status-badge pending">{{ currentUser()!.status }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Process Timeline -->
              <div class="timeline-section">
                <h2>Processo de Verificação</h2>
                
                <div class="timeline">
                  <div class="timeline-item completed">
                    <div class="timeline-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M9 11L12 14L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 20.5304 3 20V9C3 8.46957 3.21071 7.96086 3.58579 7.58579C3.96086 7.21071 4.46957 7 5 7H13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <div class="timeline-content">
                      <h3>Solicitação Enviada</h3>
                      <p>Seus dados foram recebidos com sucesso</p>
                      <span class="timeline-time">Concluído</span>
                    </div>
                  </div>

                  <div class="timeline-item completed">
                    <div class="timeline-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M19 7V6C19 5.46957 18.7893 4.96086 18.4142 4.58579C18.0391 4.21071 17.5304 4 17 4H5C4.46957 4 3.96086 4.21071 3.58579 4.58579C3.21071 4.96086 3 5.46957 3 6V18C3 18.5304 3.21071 19.0391 3.58579 19.4142C3.96086 19.7893 4.46957 20 5 20H17C17.5304 20 18.0391 19.7893 18.4142 19.4142C18.7893 19.0391 19 18.5304 19 18V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="15.5" cy="11.5" r="2.5" stroke="currentColor" stroke-width="2"/>
                      </svg>
                    </div>
                    <div class="timeline-content">
                      <h3>Carteira Verificada</h3>
                      <p>Conexão com a carteira Bitcoin confirmada</p>
                      <span class="timeline-time">Concluído</span>
                    </div>
                  </div>

                  <div class="timeline-item active">
                    <div class="timeline-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <div class="timeline-content">
                      <h3>Análise de Segurança</h3>
                      <p>Verificando credenciais e histórico</p>
                      <span class="timeline-time">Em andamento</span>
                    </div>
                  </div>

                  <div class="timeline-item pending">
                    <div class="timeline-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H4C2.93913 15 1.92172 15.4214 1.17157 16.1716C0.421427 16.9217 0 17.9391 0 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="8" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                        <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" stroke-width="2"/>
                        <line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" stroke-width="2"/>
                      </svg>
                    </div>
                    <div class="timeline-content">
                      <h3>Aprovação Final</h3>
                      <p>Liberação do acesso à plataforma</p>
                      <span class="timeline-time">Aguardando</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Estimated Time -->
              <div class="estimate-section">
                <div class="estimate-card">
                  <div class="estimate-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="estimate-content">
                    <h3>Tempo Estimado</h3>
                    <p>A análise pode levar de <strong>2 a 24 horas</strong></p>
                    <small>Você será notificado por email assim que for aprovado</small>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="actions-section">
                <button class="btn btn-outline" (click)="goToLanding()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Voltar ao Início
                </button>
                <button class="btn btn-primary" (click)="checkStatus()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12C3 7.02944 7.02944 3 12 3C14.5755 3 16.9 4.15205 18.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M21 12C21 16.9706 16.9706 21 12 21C9.42446 21 7.09995 19.848 5.5 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M13 2L18 6L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M11 22L6 18L10 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Verificar Status
                </button>
              </div>
            } @else {
              <!-- No User Info -->
              <div class="no-user-section">
                <div class="no-user-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 17H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <h3>Nenhuma solicitação encontrada</h3>
                <p>Você ainda não enviou uma solicitação de acesso.</p>
                <button class="btn btn-primary" (click)="goToRequestInvite()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H4C2.93913 15 1.92172 15.4214 1.17157 16.1716C0.421427 16.9217 0 17.9391 0 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="8" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                    <line x1="20" y1="8" x2="20" y2="14" stroke="currentColor" stroke-width="2"/>
                    <line x1="23" y1="11" x2="17" y2="11" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  Solicitar Acesso
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pending-page {
      min-height: 100vh;
      background: var(--background-dark);
      padding: var(--spacing-xl) 0;
    }

    /* Main Section */
    .pending-section {
      display: flex;
      justify-content: center;
    }

    .pending-card {
      max-width: 800px;
      width: 100%;
      padding: var(--spacing-2xl);
      background: var(--background-card);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-lg);
    }

    /* Status Header */
    .status-header {
      text-align: center;
      margin-bottom: var(--spacing-2xl);
    }

    .status-icon {
      color: var(--warning-yellow);
      margin-bottom: var(--spacing-lg);
    }

    .status-header h1 {
      font-size: var(--font-size-3xl);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-sm) 0;
    }

    .status-header p {
      font-size: var(--font-size-lg);
      color: var(--text-secondary);
      margin: 0;
    }

    /* User Info Section */
    .user-info-section {
      margin-bottom: var(--spacing-2xl);
    }

    .user-info-section h2 {
      font-size: var(--font-size-xl);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-lg) 0;
      text-align: center;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-xl);
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
      background: var(--background-elevated);
      border-radius: var(--border-radius-md);
    }

    .info-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: var(--background-card);
      border-radius: var(--border-radius-md);
      color: var(--primary-blue);
      flex-shrink: 0;
    }

    .info-content {
      flex: 1;
      min-width: 0;
    }

    .info-label {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      margin-bottom: var(--spacing-xs);
    }

    .info-value {
      font-size: var(--font-size-md);
      font-weight: 500;
      color: var(--text-primary);
      word-break: break-all;
    }

    .info-value.wallet {
      font-family: 'Courier New', monospace;
      font-size: var(--font-size-sm);
      background: var(--background-card);
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--border-radius-sm);
      word-break: break-all;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: var(--spacing-xs) var(--spacing-sm);
      border-radius: var(--border-radius-sm);
      font-size: var(--font-size-xs);
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.pending {
      background: var(--warning-yellow);
      color: var(--background-dark);
    }

    /* Timeline Section */
    .timeline-section {
      margin-bottom: var(--spacing-2xl);
    }

    .timeline-section h2 {
      font-size: var(--font-size-xl);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-lg) 0;
      text-align: center;
    }

    .timeline {
      position: relative;
      padding-left: var(--spacing-2xl);
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 20px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--border-color);
    }

    .timeline-item {
      position: relative;
      margin-bottom: var(--spacing-xl);
    }

    .timeline-item:last-child {
      margin-bottom: 0;
    }

    .timeline-icon {
      position: absolute;
      left: -32px;
      top: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid var(--border-color);
      background: var(--background-card);
    }

    .timeline-item.completed .timeline-icon {
      background: var(--success-green);
      border-color: var(--success-green);
      color: white;
    }

    .timeline-item.active .timeline-icon {
      background: var(--warning-yellow);
      border-color: var(--warning-yellow);
      color: var(--background-dark);
      animation: pulse 2s infinite;
    }

    .timeline-item.pending .timeline-icon {
      background: var(--background-elevated);
      border-color: var(--border-color);
      color: var(--text-muted);
    }

    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.4);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(255, 193, 7, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(255, 193, 7, 0);
      }
    }

    .timeline-content h3 {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-xs) 0;
    }

    .timeline-content p {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      margin: 0 0 var(--spacing-xs) 0;
      line-height: 1.4;
    }

    .timeline-time {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      font-weight: 500;
    }

    .timeline-item.completed .timeline-time {
      color: var(--success-green);
    }

    .timeline-item.active .timeline-time {
      color: var(--warning-yellow);
    }

    /* Estimate Section */
    .estimate-section {
      margin-bottom: var(--spacing-2xl);
    }

    .estimate-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-lg);
      padding: var(--spacing-lg);
      background: var(--background-elevated);
      border: 1px solid var(--primary-blue);
      border-radius: var(--border-radius-md);
    }

    .estimate-icon {
      color: var(--primary-blue);
      flex-shrink: 0;
    }

    .estimate-content h3 {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-xs) 0;
    }

    .estimate-content p {
      font-size: var(--font-size-md);
      color: var(--text-secondary);
      margin: 0 0 var(--spacing-xs) 0;
    }

    .estimate-content small {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
    }

    /* Actions Section */
    .actions-section {
      display: flex;
      gap: var(--spacing-md);
      justify-content: center;
      flex-wrap: wrap;
    }

    /* No User Section */
    .no-user-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-lg);
      padding: var(--spacing-2xl);
      text-align: center;
    }

    .no-user-icon {
      color: var(--text-muted);
    }

    .no-user-section h3 {
      font-size: var(--font-size-xl);
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .no-user-section p {
      color: var(--text-secondary);
      margin: 0;
    }

    /* Responsividade */
    @media (max-width: 768px) {
      .pending-page {
        padding: var(--spacing-lg) 0;
      }

      .pending-card {
        padding: var(--spacing-lg);
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .timeline {
        padding-left: var(--spacing-lg);
      }

      .timeline::before {
        left: 16px;
      }

      .timeline-icon {
        left: 0;
        width: 28px;
        height: 28px;
      }

      .estimate-card {
        flex-direction: column;
        text-align: center;
      }

      .actions-section {
        flex-direction: column;
      }
    }

    @media (max-width: 480px) {
      .status-header h1 {
        font-size: var(--font-size-2xl);
      }

      .info-item {
        flex-direction: column;
        text-align: center;
      }

      .timeline-content h3 {
        font-size: var(--font-size-md);
      }
    }
  `]
})
export class PendingApprovalComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);

  currentUser = this.userService.getCurrentUser();

  ngOnInit() {
    // Verificar se há um orderId na query string (para compras)
    this.route.queryParams.subscribe(params => {
      if (params['orderId']) {
        // Lógica específica para aprovação de compra
      }
    });
  }

  formatWalletAddress(address: string): string {
    if (!address) return '';
    if (address.length <= 20) return address;
    return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
  }

  checkStatus() {
    // Simular verificação de status
    const user = this.currentUser();
    if (user && Math.random() > 0.7) { // 30% chance de aprovação
      // Simular aprovação - redirecionar para dashboard
      alert('Parabéns! Sua solicitação foi aprovada!');
      this.router.navigate(['/dashboard']);
    } else {
      alert('Status ainda em análise. Por favor, aguarde mais um pouco.');
    }
  }

  goToLanding() {
    this.router.navigate(['/']);
  }

  goToRequestInvite() {
    this.router.navigate(['/request-invite']);
  }
}

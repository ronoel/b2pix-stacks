import { Component, output } from '@angular/core';


export type WalletRecommendation = 'external' | 'embedded' | 'import';

@Component({
  selector: 'app-wallet-recommendation',
  imports: [],
  standalone: true,
  template: `
    <div class="wallet-recommendation-section">
      <div class="container">
        <h3 class="section-title">Escolha como você quer começar</h3>
        <p class="section-subtitle">
          Selecione a opção que melhor se adapta à sua experiência com criptomoedas
        </p>

        <div class="wallet-options">
          <!-- External Wallet Option -->
          <div class="wallet-card">
            <div class="wallet-icon external">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M3 10h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="17" cy="14" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <div class="wallet-content">
              <h4 class="wallet-title">Tenho uma Carteira</h4>
              <p class="wallet-description">
                Já possuo Leather, Xverse ou outra wallet extension instalada no navegador.
              </p>
              <button class="btn btn-wallet" (click)="onSelectWallet('external')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Conectar Carteira Externa
              </button>
              <a href="https://leather.io/wallet" target="_blank" rel="noopener noreferrer" class="link-helper">
                Ainda não tem? Instalar Leather Wallet
              </a>
            </div>
          </div>

          <!-- Embedded Wallet Option -->
          <div class="wallet-card highlighted">
            <div class="badge-new">Novo!</div>
            <div class="wallet-icon embedded">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="wallet-content">
              <h4 class="wallet-title">Carteira Embarcada</h4>
              <p class="wallet-description">
                Novo em criptomoedas? Crie uma carteira integrada protegida por senha - sem complicação!
              </p>
              <button class="btn btn-wallet-primary" (click)="onSelectWallet('embedded')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Criar Nova Carteira
              </button>
              <button class="btn btn-wallet-secondary" (click)="onSelectWallet('import')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Importar Carteira Existente
              </button>
              <p class="feature-list">
                ✓ Sem extensões necessárias<br>
                ✓ Proteção por senha<br>
                ✓ Ideal para iniciantes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 16px;
    }

    .wallet-recommendation-section {
      padding: 60px 0;
      background: linear-gradient(135deg, #EFF6FF 0%, #FEF3C7 100%);
      border-top: 1px solid #E5E7EB;
    }

    .section-title {
      font-size: 32px;
      font-weight: 700;
      color: #1F2937;
      text-align: center;
      margin: 0 0 12px 0;
    }

    .section-subtitle {
      font-size: 16px;
      color: #6B7280;
      text-align: center;
      margin: 0 0 40px 0;
      line-height: 1.6;
    }

    .wallet-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      max-width: 900px;
      margin: 0 auto;
    }

    .wallet-card {
      position: relative;
      padding: 32px;
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
      text-align: center;
    }

    .wallet-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
    }

    .wallet-card.highlighted {
      border-color: #10B981;
      background: linear-gradient(135deg, #FFFFFF 0%, #ECFDF5 100%);
    }

    .badge-new {
      position: absolute;
      top: 16px;
      right: 16px;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .wallet-icon {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
    }

    .wallet-icon.external {
      background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
    }

    .wallet-icon.embedded {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
    }

    .wallet-content {
      flex: 1;
    }

    .wallet-title {
      font-size: 20px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 8px 0;
    }

    .wallet-description {
      font-size: 14px;
      color: #6B7280;
      margin: 0 0 20px 0;
      line-height: 1.6;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      width: 100%;
    }

    .btn-wallet {
      background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .btn-wallet:hover {
      background: linear-gradient(135deg, #2563EB 0%, #1E40AF 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
    }

    .btn-wallet-primary {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    .btn-wallet-primary:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5);
    }

    .btn-wallet-secondary {
      background: #FFFFFF;
      color: #059669;
      border: 2px solid #10B981;
      margin-top: 12px;
    }

    .btn-wallet-secondary:hover {
      background: #F0FDF4;
      transform: translateY(-1px);
    }

    .link-helper {
      display: inline-block;
      margin-top: 12px;
      font-size: 13px;
      color: #3B82F6;
      text-decoration: none;
      transition: color 0.2s;
    }

    .link-helper:hover {
      color: #2563EB;
      text-decoration: underline;
    }

    .feature-list {
      margin-top: 16px;
      font-size: 13px;
      color: #059669;
      line-height: 1.8;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .section-title {
        font-size: 24px;
      }

      .section-subtitle {
        font-size: 14px;
      }

      .wallet-options {
        grid-template-columns: 1fr;
      }

      .wallet-card {
        padding: 24px;
      }
    }
  `]
})
export class WalletRecommendationComponent {
  readonly walletSelected = output<WalletRecommendation>();

  onSelectWallet(type: WalletRecommendation) {
    this.walletSelected.emit(type);
  }
}

import { Component } from '@angular/core';


@Component({
  selector: 'app-trust-section',
  imports: [],
  standalone: true,
  template: `
    <div class="trust-section">
      <div class="container">
        <h3 class="trust-title">Por que escolher B2Pix?</h3>
        <div class="trust-indicators">
          <div class="trust-badge">
            <div class="trust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" fill="currentColor"/>
              </svg>
            </div>
            <div class="trust-content">
              <h4 class="trust-name">Compra Segura</h4>
              <p class="trust-description">Transações protegidas com smart contracts</p>
            </div>
          </div>

          <div class="trust-badge">
            <div class="trust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <div class="trust-content">
              <h4 class="trust-name">Pagamento PIX</h4>
              <p class="trust-description">Transferências instantâneas e automáticas</p>
            </div>
          </div>

          <div class="trust-badge">
            <div class="trust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <div class="trust-content">
              <h4 class="trust-name">Sem Custódia</h4>
              <p class="trust-description">Você mantém controle total dos seus Bitcoins</p>
            </div>
          </div>

          <div class="trust-badge">
            <div class="trust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="trust-content">
              <h4 class="trust-name">Automático</h4>
              <p class="trust-description">Processo automatizado do início ao fim</p>
            </div>
          </div>
        </div>
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

    /* Trust Section */
    .trust-section {
      padding: 48px 0;
      background: #FFFFFF;
      border-top: 1px solid #E5E7EB;
    }

    .trust-title {
      text-align: center;
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 48px 0;
    }

    .trust-indicators {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .trust-badge {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 24px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .trust-badge:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      border-color: #3B82F6;
    }

    .trust-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: #ECFDF5;
      color: #059669;
      border-radius: 16px;
      flex-shrink: 0;
    }

    .trust-content {
      flex: 1;
    }

    .trust-name {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 6px 0;
    }

    .trust-description {
      font-size: 14px;
      color: #6B7280;
      margin: 0;
      line-height: 1.6;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .container {
        padding: 0 12px;
      }

      .trust-indicators {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }

      .trust-badge {
        padding: 16px;
      }

      .trust-icon {
        width: 40px;
        height: 40px;
      }
    }

    @media (max-width: 480px) {
      .trust-section {
        padding: 32px 0;
      }

      .trust-title {
        font-size: 20px;
        margin-bottom: 32px;
      }

      .trust-indicators {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }
  `]
})
export class TrustSectionComponent {}

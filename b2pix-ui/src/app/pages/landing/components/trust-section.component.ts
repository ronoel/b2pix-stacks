import { Component } from '@angular/core';


@Component({
  selector: 'app-trust-section',
  imports: [],
  standalone: true,
  template: `
    <div class="trust-section">
      <div class="container">
        <div class="trust-header">
          <span class="trust-eyebrow">Segurança e Confiança</span>
          <h3 class="trust-title">Por que escolher B2Pix?</h3>
          <p class="trust-subtitle">Uma plataforma construída com foco em segurança, transparência e simplicidade</p>
        </div>
        <div class="trust-indicators">
          <div class="trust-badge">
            <div class="trust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" fill="currentColor"/>
                <path d="M9 12l2 2 4-4" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="trust-content">
              <h4 class="trust-name">Smart Contracts</h4>
              <p class="trust-description">Transações protegidas por contratos inteligentes na blockchain do Bitcoin L2</p>
            </div>
          </div>

          <div class="trust-badge">
            <div class="trust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <div class="trust-content">
              <h4 class="trust-name">100% Transparente</h4>
              <p class="trust-description">Todas as transações são verificáveis publicamente na blockchain</p>
            </div>
          </div>

          <div class="trust-badge">
            <div class="trust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <div class="trust-content">
              <h4 class="trust-name">Sem Custódia</h4>
              <p class="trust-description">Você mantém controle total dos seus Bitcoins em sua própria carteira</p>
            </div>
          </div>

          <div class="trust-badge">
            <div class="trust-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="trust-content">
              <h4 class="trust-name">Liquidação Instantânea</h4>
              <p class="trust-description">Receba seus Bitcoins imediatamente após a confirmação do PIX</p>
            </div>
          </div>
        </div>

        <!-- Technology Badge -->
        <div class="tech-badge-container">
          <div class="tech-badge">
            <span class="tech-label">Construído sobre</span>
            <div class="tech-logos">
              <div class="tech-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#F7931A" stroke-width="2"/>
                  <path d="M14.5 10.5c.5-.5.5-1.5 0-2s-1.5-.5-2 0l-3 3c-.5.5-.5 1.5 0 2s1.5.5 2 0l3-3z" fill="#F7931A"/>
                  <path d="M9.5 13.5c-.5.5-.5 1.5 0 2s1.5.5 2 0l3-3c.5-.5.5-1.5 0-2s-1.5-.5-2 0l-3 3z" fill="#F7931A"/>
                </svg>
                <span>Bitcoin</span>
              </div>
              <span class="tech-separator">+</span>
              <div class="tech-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" stroke="#5546FF" stroke-width="2"/>
                </svg>
                <span>Stacks L2</span>
              </div>
              <span class="tech-separator">+</span>
              <div class="tech-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" stroke="#32BCAD" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>PIX</span>
              </div>
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
      padding: 64px 0;
      background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);
      border-top: 1px solid #E5E7EB;
    }

    .trust-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .trust-eyebrow {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #1E40AF;
      background: #EFF6FF;
      padding: 6px 12px;
      border-radius: 20px;
      margin-bottom: 16px;
    }

    .trust-title {
      font-size: 28px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 12px 0;
    }

    .trust-subtitle {
      font-size: 16px;
      color: #6B7280;
      margin: 0;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.6;
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
      padding: 28px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      transition: all 0.3s ease;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05);
    }

    .trust-badge:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px -6px rgb(0 0 0 / 0.12);
      border-color: #1E40AF;
    }

    .trust-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
      color: #059669;
      border-radius: 14px;
      flex-shrink: 0;
    }

    .trust-content {
      flex: 1;
    }

    .trust-name {
      font-size: 17px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 8px 0;
    }

    .trust-description {
      font-size: 14px;
      color: #6B7280;
      margin: 0;
      line-height: 1.6;
    }

    /* Technology Badge */
    .tech-badge-container {
      display: flex;
      justify-content: center;
      margin-top: 48px;
    }

    .tech-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 20px 32px;
      background: linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%);
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      box-shadow: 0 2px 8px 0 rgb(0 0 0 / 0.04);
    }

    .tech-label {
      font-size: 12px;
      font-weight: 500;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .tech-logos {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .tech-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }

    .tech-separator {
      color: #D1D5DB;
      font-weight: 400;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .container {
        padding: 0 12px;
      }

      .trust-section {
        padding: 48px 0;
      }

      .trust-title {
        font-size: 24px;
      }

      .trust-indicators {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }

      .trust-badge {
        padding: 20px;
      }

      .trust-icon {
        width: 44px;
        height: 44px;
      }

      .tech-logos {
        gap: 12px;
      }

      .tech-item span {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .trust-section {
        padding: 32px 0;
      }

      .trust-header {
        margin-bottom: 32px;
      }

      .trust-title {
        font-size: 22px;
      }

      .trust-subtitle {
        font-size: 14px;
      }

      .trust-indicators {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .tech-badge {
        padding: 16px 24px;
      }

      .tech-item span {
        display: inline;
        font-size: 12px;
      }

      .tech-logos {
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
      }
    }
  `]
})
export class TrustSectionComponent {}

import { Component } from '@angular/core';


@Component({
  selector: 'app-how-it-works',
  imports: [],
  standalone: true,
  template: `
    <div class="how-it-works-section">
      <div class="container">
        <h3 class="section-title">Como Funciona</h3>
        <p class="section-description">Compre e venda Bitcoin com PIX em 3 passos simples</p>

        <div class="steps-grid">
          <div class="step-card">
            <div class="step-number">1</div>
            <div class="step-content">
              <h4 class="step-title">Conecte sua Carteira</h4>
              <p class="step-description">Crie uma carteira integrada ou conecte sua carteira externa. Simples, rápido e seguro.</p>
            </div>
          </div>

          <div class="step-card">
            <div class="step-number">2</div>
            <div class="step-content">
              <h4 class="step-title">Escolha o Valor</h4>
              <p class="step-description">Defina quanto quer comprar em Reais. A plataforma calcula automaticamente quanto receberá em Bitcoin.</p>
            </div>
          </div>

          <div class="step-card">
            <div class="step-number">3</div>
            <div class="step-content">
              <h4 class="step-title">Pague e Receba</h4>
              <p class="step-description">Faça o PIX e pronto. O pagamento é verificado automaticamente e os Bitcoins são enviados direto para sua carteira.</p>
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

    /* How It Works Section */
    .how-it-works-section {
      padding: 64px 0;
      background: #FFFFFF;
      border-top: 1px solid #E5E7EB;
    }

    .section-title {
      text-align: center;
      font-size: 28px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 12px 0;
    }

    .section-description {
      text-align: center;
      font-size: 16px;
      color: #6B7280;
      margin: 0 0 48px 0;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .steps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 32px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .step-card {
      display: flex;
      gap: 20px;
      padding: 32px;
      background: linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%);
      border: 2px solid #E5E7EB;
      border-radius: 16px;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .step-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.3s ease;
    }

    .step-card:hover::before {
      transform: scaleX(1);
    }

    .step-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px -6px rgb(0 0 0 / 0.15);
      border-color: #3B82F6;
    }

    .step-number {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%);
      color: #FFFFFF;
      font-size: 24px;
      font-weight: 700;
      border-radius: 12px;
      box-shadow: 0 4px 12px 0 rgb(245 158 11 / 0.3);
    }

    .step-content {
      flex: 1;
    }

    .step-title {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 8px 0;
    }

    .step-description {
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

      .how-it-works-section {
        padding: 48px 0;
      }

      .section-title {
        font-size: 24px;
      }

      .section-description {
        font-size: 14px;
        margin-bottom: 32px;
      }

      .steps-grid {
        gap: 24px;
      }

      .step-card {
        padding: 24px;
      }

      .step-number {
        width: 40px;
        height: 40px;
        font-size: 20px;
      }
    }

    @media (max-width: 480px) {
      .how-it-works-section {
        padding: 32px 0;
      }

      .section-title {
        font-size: 20px;
      }

      .steps-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .step-card {
        padding: 20px;
        gap: 16px;
      }

      .step-number {
        width: 36px;
        height: 36px;
        font-size: 18px;
      }

      .step-title {
        font-size: 16px;
      }

      .step-description {
        font-size: 13px;
      }
    }
  `]
})
export class HowItWorksComponent {}

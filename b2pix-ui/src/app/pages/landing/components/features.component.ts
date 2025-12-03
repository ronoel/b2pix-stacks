import { Component, inject } from '@angular/core';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-landing-features',
  imports: [],
  standalone: true,
  template: `
    <div class="features">
      @for (feature of features; track feature.label) {
        <div class="feature" [attr.data-tooltip]="feature.tooltip">
          <div class="feature-icon" [innerHTML]="feature.icon"></div>
          <span>{{ feature.label }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Features */
    .features {
      display: flex;
      justify-content: center;
      gap: 32px;
      margin-bottom: 48px;
      flex-wrap: wrap;
    }

    .feature {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      color: #6B7280;
      font-weight: 500;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
      transition: all 0.2s ease;
      position: relative;
      cursor: help;
    }

    .feature:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px 0 rgb(0 0 0 / 0.15);
      border-color: #3B82F6;
    }

    .feature-icon {
      color: #F59E0B;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Tooltip styles */
    .feature[data-tooltip]::before {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 12px);
      left: 50%;
      transform: translateX(-50%);
      background: #1F2937;
      color: #FFFFFF;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 400;
      line-height: 1.5;
      white-space: normal;
      width: max-content;
      max-width: 280px;
      box-shadow: 0 4px 12px 0 rgb(0 0 0 / 0.3);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
      pointer-events: none;
      z-index: 100;
    }

    .feature[data-tooltip]::after {
      content: '';
      position: absolute;
      bottom: calc(100% + 4px);
      left: 50%;
      transform: translateX(-50%);
      border: 8px solid transparent;
      border-top-color: #1F2937;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease, visibility 0.2s ease;
      pointer-events: none;
      z-index: 100;
    }

    .feature[data-tooltip]:hover::before,
    .feature[data-tooltip]:hover::after {
      opacity: 1;
      visibility: visible;
    }

    .feature[data-tooltip]:hover::before {
      transform: translateX(-50%) translateY(-4px);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .features {
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      .feature {
        width: 100%;
        max-width: 300px;
        justify-content: center;
      }

      /* Adjust tooltip width on mobile */
      .feature[data-tooltip]::before {
        max-width: 240px;
        font-size: 12px;
      }
    }
  `]
})
export class LandingFeaturesComponent {
  private sanitizer = inject(DomSanitizer);

  features: Array<{label: string, tooltip: string, icon: SafeHtml}>;

  constructor() {
    this.features = [
      {
        icon: this.sanitizer.bypassSecurityTrustHtml(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>`),
        label: 'Sem Custódia',
        tooltip: 'Você mantém controle total dos seus Bitcoins. Compre sBTC diretamente na sua carteira.'
      },
      {
        icon: this.sanitizer.bypassSecurityTrustHtml(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
                <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>`),
        label: 'Automático',
        tooltip: 'Os pagamentos são verificados automaticamente pelo sistema e o Bitcoin é transferido instantaneamente após confirmação.'
      },
      {
        icon: this.sanitizer.bypassSecurityTrustHtml(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>`),
        label: 'Segurança',
        tooltip: 'Seus Bitcoins são protegidos pela blockchain do Bitcoin Layer 2 (Stacks) usando smart contracts.'
      }
    ];
  }
}

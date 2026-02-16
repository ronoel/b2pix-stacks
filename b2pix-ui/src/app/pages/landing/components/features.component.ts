import { Component, inject } from '@angular/core';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-landing-features',
  imports: [],
  standalone: true,
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss'
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

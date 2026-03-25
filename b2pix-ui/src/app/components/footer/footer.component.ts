import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <footer class="footer" role="contentinfo">
      <div class="footer-inner">
        <div class="footer-brand">
          <img src="images/logo-512px-t.png" alt="B2Pix Logo" width="24" height="24" class="footer-logo">
          <span class="footer-brand-name">B2Pix</span>
        </div>

        <div class="footer-social">
          <a href="https://t.me/+XGmtL15A4BszMmQx" target="_blank" rel="noopener noreferrer" aria-label="Telegram" class="footer-social-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 2L3 8.5L10 13L15 20L21 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M13 13L21 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
          <a href="https://x.com/b2pixorg" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" class="footer-social-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="https://www.instagram.com/b2pix_" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="footer-social-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="currentColor" stroke-width="2"/>
              <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/>
              <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/>
            </svg>
          </a>
        </div>

        <div class="footer-legal">
          <p class="footer-copyright">© {{ currentYear }} B2Pix. Todos os direitos reservados.</p>
          <p class="footer-disclaimer">Bitcoin é um ativo volátil. Invista com responsabilidade.</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
      margin-top: auto;
    }

    .footer-inner {
      max-width: 440px;
      margin: 0 auto;
      padding: 32px 20px calc(72px + env(safe-area-inset-bottom, 0px));
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      text-align: center;
    }

    .footer-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .footer-logo {
      flex-shrink: 0;
      border-radius: var(--r-sm);
    }

    .footer-brand-name {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .footer-social {
      display: flex;
      gap: 12px;
    }

    .footer-social-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      background: var(--bg-primary);
      color: var(--text-secondary);
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .footer-social-link:hover {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
      transform: translateY(-1px);
    }

    .footer-legal {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .footer-copyright {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0;
    }

    .footer-disclaimer {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0;
    }

    @media (prefers-contrast: high) {
      .footer {
        border-top-width: 2px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .footer-social-link {
        transition: none;
      }

      .footer-social-link:hover {
        transform: none;
      }
    }
  `]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}

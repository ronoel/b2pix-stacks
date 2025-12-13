import { Component, ViewEncapsulation } from '@angular/core';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <footer class="footer" role="contentinfo">
      <div class="container">
        <!-- Footer Bottom -->
        <div class="footer-bottom">
          <div class="footer-info">
            <div class="brand-logo">
              <img src="images/logo-512px-t.png" alt="B2Pix Logo" width="32" height="32" class="logo-image">
              <div class="brand-text">
                <span class="brand-name">B2Pix</span>
                <span class="brand-tagline">P2P Bitcoin com PIX</span>
              </div>
            </div>
            <div class="footer-legal">
              <p class="copyright">
                © {{ currentYear }} B2Pix. Todos os direitos reservados.
              </p>
              <p class="disclaimer">
                Bitcoin é um ativo volátil. Invista com responsabilidade.
              </p>
            </div>
          </div>
          
          <div class="footer-social">
            <span class="social-label">Siga-nos:</span>
            <div class="social-links">
              <a href="https://t.me/+XGmtL15A4BszMmQx" target="_blank" rel="noopener noreferrer" aria-label="Telegram" class="social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M21 2L3 8.5L10 13L15 20L21 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M13 13L21 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </a>
              <a href="https://x.com/b2pixorg" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" class="social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/b2pix_" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="currentColor" stroke-width="2"/>
                  <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/>
                  <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`

    /* Container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 var(--spacing-4);
    }

    /* Footer */
    .footer {
      background: var(--gradient-subtle);
      border-top: 1px solid var(--border-color);
      margin-top: auto;
    }

    /* Footer Bottom */
    .footer-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-8) 0;
    }

    .footer-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-6);
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: var(--spacing-3);
    }

    .logo-image {
      flex-shrink: 0;
      border-radius: var(--border-radius-md);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      color: var(--text-primary);
      line-height: 1.2;
    }

    .brand-tagline {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--text-muted);
      line-height: 1;
      margin-top: -2px;
    }

    .footer-legal {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-1);
    }

    .copyright {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      margin: 0;
    }

    .disclaimer {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      margin: 0;
    }

    .footer-social {
      display: flex;
      align-items: center;
      gap: var(--spacing-4);
    }

    .social-label {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .social-links {
      display: flex;
      gap: var(--spacing-2);
    }

    .social-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: var(--background-elevated);
      color: var(--text-secondary);
      border-radius: var(--border-radius-md);
      transition: all var(--transition-normal);
      text-decoration: none;
    }

    .social-link:hover {
      background: var(--primary-trust-blue);
      color: var(--text-inverse);
      transform: translateY(-1px);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .footer-bottom {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-6);
        padding: var(--spacing-6) 0;
      }

      .footer-info {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-4);
      }

      .footer-social {
        align-self: stretch;
        justify-content: space-between;
      }
    }

    @media (max-width: 480px) {
      .container {
        padding: 0 var(--spacing-3);
      }

      .brand-logo {
        gap: var(--spacing-2);
      }

      .logo-image {
        width: 28px;
        height: 28px;
      }

      .footer-info {
        gap: var(--spacing-3);
      }

      .social-links {
        gap: var(--spacing-1);
      }

      .social-link {
        width: 36px;
        height: 36px;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .footer {
        border-top-width: 2px;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .social-link {
        transition: none;
      }

      .social-link:hover {
        transform: none;
      }
    }
  `]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
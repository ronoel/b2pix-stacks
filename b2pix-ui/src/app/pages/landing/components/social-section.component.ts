import { Component } from '@angular/core';


@Component({
  selector: 'app-social-section',
  imports: [],
  standalone: true,
  template: `
    <div class="social-section">
      <h3 class="social-title">Siga-nos nas redes sociais</h3>
      <p class="social-description">Fique por dentro das novidades e atualizações.</p>
      <div class="social-links">
        <a href="https://t.me/+XGmtL15A4BszMmQx" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Telegram">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M21 2L3 8.5L10 13L15 20L21 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M13 13L21 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
        <a href="https://x.com/b2pixorg" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="X (Twitter)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
        <a href="https://www.instagram.com/b2pix_" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Instagram">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/>
            <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/>
          </svg>
        </a>
      </div>
    </div>
  `,
  styles: [`
    /* Social Media Section */
    .social-section {
      text-align: center;
      margin-bottom: 48px;
    }

    .social-title {
      font-size: 20px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 8px 0;
    }

    .social-description {
      font-size: 14px;
      color: #6B7280;
      margin: 0 0 24px 0;
    }

    .social-links {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .social-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      color: #6B7280;
      transition: all 0.2s ease;
      text-decoration: none;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .social-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px 0 rgb(0 0 0 / 0.15);
      border-color: #3B82F6;
      color: #3B82F6;
    }

    .social-link svg {
      width: 24px;
      height: 24px;
    }

    /* Responsive Design */
    @media (max-width: 480px) {
      .social-title {
        font-size: 18px;
      }

      .social-links {
        gap: 12px;
      }
    }
  `]
})
export class SocialSectionComponent {}

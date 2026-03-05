import { Component, computed, input, signal } from '@angular/core';
import { formatSats, formatTruncated, getExplorerUrl } from '../../shared/utils/format.util';

@Component({
  selector: 'app-technical-details',
  standalone: true,
  template: `
    <div class="tech-details">
      <button class="tech-details__toggle" (click)="expanded.set(!expanded())">
        <span>{{ expanded() ? '&#9660;' : '&#9654;' }} Detalhes da transa&ccedil;&atilde;o</span>
      </button>
      @if (expanded()) {
        <div class="tech-details__content">
          @if (status()) {
            <div class="tech-details__row">
              <span class="tech-details__label">Status</span>
              <span class="tech-details__value" [class]="'status--' + status()">{{ statusLabel() }}</span>
            </div>
          }
          @if (txHash()) {
            <div class="tech-details__row">
              <span class="tech-details__label">C&oacute;digo da transa&ccedil;&atilde;o</span>
              <span class="tech-details__value font-mono">{{ truncatedHash() }}</span>
            </div>
          }
          @if (satoshis()) {
            <div class="tech-details__row">
              <span class="tech-details__label">Satoshis</span>
              <span class="tech-details__value font-mono">{{ formattedSats() }}</span>
            </div>
          }
          @if (blockHeight()) {
            <div class="tech-details__row">
              <span class="tech-details__label">Bloco</span>
              <span class="tech-details__value font-mono">{{ blockHeight() }}</span>
            </div>
          }
          @if (txHash()) {
            <a class="tech-details__link" [href]="explorerLink()" target="_blank" rel="noopener">
              Ver comprovante na blockchain &rarr;
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .tech-details {
      border-top: 1px solid var(--border);
      padding-top: 12px;
      margin-top: 12px;
    }

    .tech-details__toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      padding: 4px 0;

      &:hover {
        color: var(--text-secondary);
      }
    }

    .tech-details__content {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 12px;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: var(--r-md);
    }

    .tech-details__row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .tech-details__label {
      font-size: 13px;
      color: var(--text-muted);
    }

    .tech-details__value {
      font-size: 13px;
      color: var(--text-primary);
    }

    .status--confirmed { color: var(--success); font-weight: 600; }
    .status--processing, .status--analyzing { color: var(--primary); font-weight: 600; }
    .status--rejected, .status--canceled, .status--expired { color: var(--danger); font-weight: 600; }
    .status--created { color: var(--warning); font-weight: 600; }

    .font-mono {
      font-family: var(--font-mono);
    }

    .tech-details__link {
      font-size: 13px;
      color: var(--primary-light);
      text-decoration: none;
      margin-top: 4px;

      &:hover {
        text-decoration: underline;
      }
    }
  `]
})
export class TechnicalDetailsComponent {
  txHash = input<string>('');
  satoshis = input<number>(0);
  blockHeight = input<number>(0);
  status = input<string>('');

  expanded = signal(false);

  truncatedHash = computed(() => formatTruncated(this.txHash()));
  formattedSats = computed(() => formatSats(this.satoshis()));
  explorerLink = computed(() => getExplorerUrl(this.txHash()));

  statusLabel = computed(() => {
    const s = this.status().toLowerCase();
    const labels: Record<string, string> = {
      'created': 'Aguardando pagamento',
      'processing': 'Verificando pagamento',
      'analyzing': 'Em análise',
      'confirmed': 'Confirmado',
      'rejected': 'Rejeitado',
      'canceled': 'Cancelado',
      'expired': 'Expirado',
    };
    return labels[s] || s;
  });
}

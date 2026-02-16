import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { AccountPixVerify } from '../../../shared/models/account-validation.model';

@Component({
  selector: 'app-pix-moderation-card',
  standalone: true,
  imports: [],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="verification-card" [class.processing]="isProcessing">
      <div class="card-header">
        <div class="card-info">
          <div class="address-badge">
            <span class="label">Endereco</span>
            <span class="value">{{ formatAddress(verification.address) }}</span>
          </div>
          <div class="status-badge processing">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Aguardando Analise
          </div>
        </div>
        <div class="card-date">
          <span class="label">Criado em</span>
          <span class="value">{{ formatDate(verification.created_at) }}</span>
        </div>
      </div>

      <div class="card-body">
        <div class="details-grid">
          <div class="detail-item">
            <span class="label">Chave PIX do Usuario</span>
            <span class="value pix-key">{{ verification.user_pix_key }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Chave PIX Destino</span>
            <span class="value pix-key">{{ verification.destination_pix_key }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Valor de Confirmacao</span>
            <span class="value highlight">R$ {{ (verification.pix_confirmation_value / 100).toFixed(2) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Codigo de Confirmacao</span>
            <span class="value code">{{ verification.pix_confirmation_code }}</span>
          </div>
          <div class="detail-item">
            <span class="label">End-to-End ID</span>
            <span class="value" [class.empty]="!verification.pix_end_to_end_id">
              {{ verification.pix_end_to_end_id || 'Nao informado' }}
            </span>
          </div>
          <div class="detail-item">
            <span class="label">Tentativas</span>
            <span class="value">{{ verification.attempts }}</span>
          </div>
        </div>
      </div>

      <div class="card-footer">
        <button
          class="btn btn-reject"
          (click)="onReject()"
          [disabled]="isProcessing"
        >
          @if (isProcessing) {
            <div class="loading-spinner-sm"></div>
          } @else {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
            </svg>
          }
          Rejeitar
        </button>
        <button
          class="btn btn-approve"
          (click)="onApprove()"
          [disabled]="isProcessing"
        >
          @if (isProcessing) {
            <div class="loading-spinner-sm"></div>
          } @else {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            </svg>
          }
          Aprovar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .verification-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .verification-card:hover {
      box-shadow: 0 10px 25px -3px rgb(0 0 0 / 0.1);
    }

    .verification-card.processing {
      opacity: 0.7;
      pointer-events: none;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 24px;
      background: #F9FAFB;
      border-bottom: 1px solid #E5E7EB;
    }

    .card-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .address-badge {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .address-badge .label {
      font-size: 12px;
      font-weight: 500;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .address-badge .value {
      font-size: 14px;
      font-weight: 600;
      color: #1F2937;
      font-family: 'Courier New', monospace;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      width: fit-content;
    }

    .status-badge.processing {
      background: #FEF3C7;
      color: #D97706;
      border: 1px solid #FCD34D;
    }

    .card-date {
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: right;
    }

    .card-date .label {
      font-size: 12px;
      font-weight: 500;
      color: #6B7280;
    }

    .card-date .value {
      font-size: 14px;
      font-weight: 500;
      color: #1F2937;
    }

    .card-body {
      padding: 24px;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .detail-item .label {
      font-size: 12px;
      font-weight: 500;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-item .value {
      font-size: 14px;
      font-weight: 500;
      color: #1F2937;
    }

    .detail-item .value.pix-key {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      word-break: break-all;
    }

    .detail-item .value.highlight {
      font-size: 18px;
      font-weight: 700;
      color: #16A34A;
    }

    .detail-item .value.code {
      font-size: 16px;
      font-weight: 700;
      color: #F59E0B;
      font-family: 'Courier New', monospace;
    }

    .detail-item .value.empty {
      color: #9CA3AF;
      font-style: italic;
    }

    .card-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      background: #F9FAFB;
      border-top: 1px solid #E5E7EB;
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
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-approve {
      background: #16A34A;
      color: white;
    }

    .btn-approve:hover:not(:disabled) {
      background: #15803D;
      transform: translateY(-1px);
    }

    .btn-reject {
      background: #DC2626;
      color: white;
    }

    .btn-reject:hover:not(:disabled) {
      background: #B91C1C;
      transform: translateY(-1px);
    }

    .loading-spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .card-header {
        flex-direction: column;
        gap: 16px;
      }

      .card-date {
        text-align: left;
      }

      .details-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .card-footer {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .card-header,
      .card-body,
      .card-footer {
        padding: 16px;
      }

      .detail-item .value.highlight {
        font-size: 16px;
      }

      .detail-item .value.code {
        font-size: 14px;
      }
    }
  `]
})
export class PixModerationCardComponent {
  @Input() verification!: AccountPixVerify;
  @Input() isProcessing = false;

  @Output() approve = new EventEmitter<string>();
  @Output() reject = new EventEmitter<string>();

  onApprove() {
    this.approve.emit(this.verification.address);
  }

  onReject() {
    this.reject.emit(this.verification.address);
  }

  formatAddress(address: string): string {
    if (address.length <= 16) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

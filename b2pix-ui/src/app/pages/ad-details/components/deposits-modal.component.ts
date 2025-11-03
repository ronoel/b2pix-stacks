import { Component, input, output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Deposit } from '../../../shared/models/advertisement.model';

@Component({
  selector: 'app-deposits-modal',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Depósitos da Publicidade</h2>
          <button class="modal-close" (click)="onClose()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        @if (isLoading()) {
          <div class="modal-body">
            <div class="loading-state">
              <div class="loading-spinner"></div>
              <p>Carregando depósitos...</p>
            </div>
          </div>
        }

        @if (!isLoading() && deposits().length > 0) {
          <div class="modal-body">
            <div class="deposits-list">
              @for (deposit of deposits(); track deposit.id) {
                <div class="deposit-card">
                  <div class="deposit-header">
                    <div class="deposit-id">
                      <span class="deposit-label">ID do Depósito:</span>
                      <span class="deposit-value">{{ deposit.id }}</span>
                    </div>
                    <div class="deposit-status-badge" [ngClass]="getDepositStatusClass(deposit.status)">
                      {{ getDepositStatusLabel(deposit.status) }}
                    </div>
                  </div>
                  <div class="deposit-details">
                    <div class="deposit-detail-item">
                      <span class="detail-label">Transação:</span>
                      <span class="detail-value">
                        <a
                          [href]="getBlockchainExplorerUrl(deposit.transaction_id)"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="blockchain-link-small"
                        >
                          {{ formatTransactionId(deposit.transaction_id) }}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" class="external-link-icon">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <polyline points="15,3 21,3 21,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </a>
                      </span>
                    </div>
                    <div class="deposit-detail-item">
                      <span class="detail-label">Valor:</span>
                      <span class="detail-value">{{ formatBTC(deposit.amount) }} BTC</span>
                    </div>
                    <div class="deposit-detail-item">
                      <span class="detail-label">Criado:</span>
                      <span class="detail-value">{{ formatDate(deposit.created_at) }}</span>
                    </div>
                    @if (deposit.confirmed_at) {
                      <div class="deposit-detail-item">
                        <span class="detail-label">Confirmado:</span>
                        <span class="detail-value">{{ formatDate(deposit.confirmed_at) }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (!isLoading() && deposits().length === 0) {
          <div class="modal-body">
            <div class="empty-state">
              <div class="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M12 6V12L16 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </div>
              <h3>Nenhum depósito encontrado</h3>
              <p>Este anúncio ainda não possui depósitos registrados.</p>
            </div>
          </div>
        }

        <div class="modal-footer">
          <button class="btn btn-outline" (click)="onClose()">Fechar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }
    .modal-content {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid #E5E7EB;
      flex-shrink: 0;
    }
    .modal-header h2 {
      font-size: 20px;
      font-weight: 700;
      color: #1F2937;
      margin: 0;
    }
    .modal-close {
      background: transparent;
      border: none;
      cursor: pointer;
      color: #6B7280;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease;
    }
    .modal-close:hover {
      color: #1F2937;
    }
    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #E5E7EB;
      flex-shrink: 0;
    }
    .deposits-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .deposit-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 16px;
      transition: all 0.2s ease;
    }
    .deposit-card:hover {
      background: #F3F4F6;
      border-color: #D1D5DB;
    }
    .deposit-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 12px;
      gap: 12px;
    }
    .deposit-id {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }
    .deposit-label {
      color: #6B7280;
      font-size: 12px;
      font-weight: 600;
    }
    .deposit-value {
      color: #1F2937;
      font-size: 13px;
      font-family: monospace;
      word-break: break-all;
    }
    .deposit-status-badge {
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      background: #F9FAFB;
      color: #059669;
      border: 1px solid #A7F3D0;
    }
    .deposit-status-badge.confirmed {
      background: #22c55e20;
      color: #22c55e;
      border-color: #22c55e;
    }
    .deposit-status-badge.pending {
      background: #f59e0b20;
      color: #f59e0b;
      border-color: #f59e0b;
    }
    .deposit-status-badge.draft {
      background: #9ca3af20;
      color: #6B7280;
      border-color: #D1D5DB;
    }
    .deposit-status-badge.failed {
      background: #ef444420;
      color: #ef4444;
      border-color: #ef4444;
    }
    .deposit-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }
    .deposit-detail-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .deposit-detail-item .detail-label {
      color: #9CA3AF;
      font-size: 12px;
    }
    .deposit-detail-item .detail-value {
      color: #1F2937;
      font-size: 13px;
      font-weight: 500;
      word-break: break-all;
    }
    .blockchain-link-small {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      color: #3B82F6;
      text-decoration: none;
      font-weight: 600;
      font-size: 11px;
      transition: all 0.2s ease;
    }
    .blockchain-link-small:hover {
      color: #2563EB;
      text-decoration: underline;
    }
    .blockchain-link-small .external-link-icon {
      margin-left: 1px;
      opacity: 0.7;
    }
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px;
      text-align: center;
    }
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #E5E7EB;
      border-top: 3px solid #1E40AF;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px;
      text-align: center;
    }
    .empty-icon {
      color: #9CA3AF;
      margin-bottom: 16px;
    }
    .empty-state h3 {
      font-size: 18px;
      color: #1F2937;
      margin: 0;
    }
    .empty-state p {
      color: #6B7280;
      margin: 0;
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
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }
    .btn-outline {
      background: transparent;
      color: #374151;
      border-color: #D1D5DB;
    }
    .btn-outline:hover:not(:disabled) {
      background: #F9FAFB;
    }
    @media (max-width: 768px) {
      .modal-content {
        max-width: 100%;
      }
      .deposit-details {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DepositsModalComponent {
  deposits = input.required<Deposit[]>();
  isLoading = input.required<boolean>();
  blockchainExplorerUrl = input.required<(txId: string) => string>();

  close = output<void>();

  onClose() {
    this.close.emit();
  }

  getDepositStatusClass(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'confirmed';
      case 'pending':
        return 'pending';
      case 'draft':
        return 'draft';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  getDepositStatusLabel(status: string): string {
    switch (status) {
      case 'draft':
        return 'Rascunho';
      case 'pending':
        return 'Pendente';
      case 'confirmed':
        return 'Confirmado';
      case 'failed':
        return 'Falhou';
      default:
        return status;
    }
  }

  formatBTC(amount: number): string {
    const btcAmount = amount / 100000000;
    return btcAmount.toFixed(8);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  formatTransactionId(txId: string): string {
    if (!txId || txId.length <= 12) return txId;
    return `${txId.substring(0, 8)}...${txId.substring(txId.length - 4)}`;
  }

  getBlockchainExplorerUrl(txId: string): string {
    return this.blockchainExplorerUrl()(txId);
  }
}

import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';

import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { PixPayoutRequestService } from '../../shared/api/pix-payout-request.service';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { BankSetupComponent } from '../../components/bank-setup/bank-setup.component';
import {
  PixPayoutRequest,
  LpStats,
  PayoutRequestStatus,
  getPayoutRequestStatusLabel,
  getPayoutRequestStatusClass,
  getSourceTypeLabel
} from '../../shared/models/pix-payout-request.model';
import {
  LpLedgerEntry,
  getLedgerEntryTypeLabel,
  getLedgerEntryTypeClass
} from '../../shared/models/lp-ledger.model';
import { LpQueueCardComponent } from './components/lp-queue-card.component';
import { LpActiveOrderComponent } from './components/lp-active-order.component';
import { LpBtcRewardsCardComponent } from './components/lp-btc-rewards-card.component';
import { LpConvertModalComponent } from './components/lp-convert-modal.component';
import { LpWithdrawModalComponent } from './components/lp-withdraw-modal.component';
import { MessageChatComponent } from '../../components/order-status/components/message-chat/message-chat.component';
import { formatBrlCents, formatSats, formatSatsToBtc, formatDateTime } from '../../shared/utils/format.util';

@Component({
  selector: 'app-lp-dashboard',
  standalone: true,
  imports: [LpQueueCardComponent, LpActiveOrderComponent, BankSetupComponent, MessageChatComponent, LpBtcRewardsCardComponent, LpConvertModalComponent, LpWithdrawModalComponent],
  templateUrl: './lp-dashboard.component.html',
  styleUrls: ['./lp-dashboard.component.scss']
})
export class LpDashboardComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private payoutRequestService = inject(PixPayoutRequestService);
  private accountValidationService = inject(AccountValidationService);

  // Tabs
  currentTab = signal<'queue' | 'history' | 'stats' | 'btc'>('queue');

  // Stats
  stats = signal<LpStats | null>(null);
  isLoadingStats = signal(false);

  // Queue
  queueItems = signal<PixPayoutRequest[]>([]);
  isLoadingQueue = signal(false);
  queuePage = signal(1);
  queueHasMore = signal(false);

  // Active Order
  activeOrder = signal<PixPayoutRequest | null>(null);
  isAcceptingOrderId = signal<string | null>(null);
  isProcessingAction = signal(false);
  processingActionType = signal('');

  // History
  historyItems = signal<PixPayoutRequest[]>([]);
  isLoadingHistory = signal(false);
  historyPage = signal(1);
  historyHasMore = signal(false);

  // BTC Rewards
  showConvertModal = signal(false);
  showWithdrawModal = signal(false);
  isConvertingBalance = signal(false);
  isWithdrawingBtc = signal(false);

  // BTC Ledger
  ledgerItems = signal<LpLedgerEntry[]>([]);
  isLoadingLedger = signal(false);
  ledgerPage = signal(1);
  ledgerHasMore = signal(false);

  // Bank Setup
  showUpdateConfirm = signal(false);
  showBankSetup = signal(false);

  // History Chat
  expandedChatId = signal<string | null>(null);

  // Feedback
  successMessage = signal('');
  errorMessage = signal('');

  // Polling
  private activeOrderPolling?: Subscription;
  private readonly POLLING_INTERVAL = 5000;

  ngOnInit() {
    this.loadStats();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  // ============================================
  // Tab Navigation
  // ============================================

  switchTab(tab: 'queue' | 'history' | 'stats' | 'btc') {
    this.currentTab.set(tab);
    this.clearMessages();

    switch (tab) {
      case 'queue':
        if (this.queueItems().length === 0 && !this.activeOrder()) {
          this.loadQueue();
        }
        break;
      case 'history':
        if (this.historyItems().length === 0) {
          this.loadHistory();
        }
        break;
      case 'stats':
        this.loadStats();
        break;
      case 'btc':
        if (this.ledgerItems().length === 0) {
          this.loadLedger();
        }
        break;
    }
  }

  // ============================================
  // Stats
  // ============================================

  loadStats() {
    this.isLoadingStats.set(true);
    this.payoutRequestService.getLpStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.isLoadingStats.set(false);

        // Check history for any active order (lp_assigned)
        this.loadActiveOrderFromHistory();
      },
      error: (error) => {
        console.error('Error loading LP stats:', error);
        this.isLoadingStats.set(false);
        // Try loading queue anyway
        this.loadQueue();
      }
    });
  }

  // ============================================
  // Queue
  // ============================================

  loadQueue() {
    this.isLoadingQueue.set(true);
    this.queuePage.set(1);

    this.payoutRequestService.getQueue({ page: 1, limit: 10 }).subscribe({
      next: (response) => {
        this.queueItems.set(response.items);
        this.queueHasMore.set(response.has_more);
        this.isLoadingQueue.set(false);
      },
      error: (error) => {
        console.error('Error loading queue:', error);
        this.isLoadingQueue.set(false);
        this.showError(this.getErrorMessage(error));
      }
    });
  }

  loadMoreQueue() {
    const nextPage = this.queuePage() + 1;
    this.isLoadingQueue.set(true);

    this.payoutRequestService.getQueue({ page: nextPage, limit: 10 }).subscribe({
      next: (response) => {
        this.queueItems.update(items => [...items, ...response.items]);
        this.queuePage.set(nextPage);
        this.queueHasMore.set(response.has_more);
        this.isLoadingQueue.set(false);
      },
      error: (error) => {
        console.error('Error loading more queue:', error);
        this.isLoadingQueue.set(false);
      }
    });
  }

  // ============================================
  // Accept Order
  // ============================================

  onAcceptOrder(orderId: string) {
    this.isAcceptingOrderId.set(orderId);
    this.clearMessages();

    this.payoutRequestService.acceptRequest(orderId).subscribe({
      next: (request) => {
        this.activeOrder.set(request);
        this.isAcceptingOrderId.set(null);
        this.queueItems.update(items => items.filter(i => i.id !== orderId));
        this.startPolling();
        this.showSuccess('Ordem aceita! Pague o PIX dentro de 15 minutos.');
      },
      error: (error) => {
        console.error('Error accepting order:', error);
        this.isAcceptingOrderId.set(null);
        this.showError(this.getErrorMessage(error));
      }
    });
  }

  // ============================================
  // Active Order Actions
  // ============================================

  private loadActiveOrderFromHistory() {
    // Fetch history and find the payout request with status 'assigned'
    this.payoutRequestService.getLpHistory({ page: 1, limit: 20 }).subscribe({
      next: (response) => {
        const activeItem = response.items.find(item => item.status === PayoutRequestStatus.LpAssigned);

        if (activeItem) {
          // Fetch full payout request details
          this.payoutRequestService.getById(activeItem.id).subscribe({
            next: (request) => {
              this.activeOrder.set(request);
              this.startPolling();
            },
            error: (error) => {
              console.error('Error loading active order details:', error);
              this.loadQueue();
            }
          });
        } else {
          // No active order found in history, load queue
          this.loadQueue();
        }
      },
      error: (error) => {
        console.error('Error loading LP history for active order:', error);
        this.loadQueue();
      }
    });
  }

  onPayOrder(pixEndToEndId: string) {
    const order = this.activeOrder();
    if (!order) return;

    this.isProcessingAction.set(true);
    this.processingActionType.set('pay');
    this.clearMessages();

    this.payoutRequestService.payRequest(order.id, pixEndToEndId).subscribe({
      next: () => {
        this.isProcessingAction.set(false);
        this.processingActionType.set('');
        this.activeOrder.set(null);
        this.stopPolling();
        this.showSuccess('Pagamento confirmado com sucesso! Credito BRL adicionado.');
        this.loadStats();
      },
      error: (error) => {
        console.error('Error paying order:', error);
        this.isProcessingAction.set(false);
        this.processingActionType.set('');
        this.showError(this.getErrorMessage(error));
      }
    });
  }

  onCancelOrder() {
    const order = this.activeOrder();
    if (!order) return;

    this.isProcessingAction.set(true);
    this.processingActionType.set('cancel');
    this.clearMessages();

    this.payoutRequestService.cancelRequest(order.id).subscribe({
      next: () => {
        this.isProcessingAction.set(false);
        this.processingActionType.set('');
        this.activeOrder.set(null);
        this.stopPolling();
        this.showSuccess('Ordem cancelada. Ela voltou para a fila.');
        this.loadQueue();
      },
      error: (error) => {
        console.error('Error cancelling order:', error);
        this.isProcessingAction.set(false);
        this.processingActionType.set('');
        this.showError(this.getErrorMessage(error));
      }
    });
  }

  onReportOrder(reason: string) {
    const order = this.activeOrder();
    if (!order) return;

    this.isProcessingAction.set(true);
    this.processingActionType.set('report');
    this.clearMessages();

    this.payoutRequestService.reportRequest(order.id, reason).subscribe({
      next: () => {
        this.isProcessingAction.set(false);
        this.processingActionType.set('');
        this.activeOrder.set(null);
        this.stopPolling();
        this.showSuccess('Problema reportado. A ordem sera analisada pela administracao.');
        this.loadQueue();
      },
      error: (error) => {
        console.error('Error reporting order:', error);
        this.isProcessingAction.set(false);
        this.processingActionType.set('');
        this.showError(this.getErrorMessage(error));
      }
    });
  }

  // ============================================
  // History
  // ============================================

  loadHistory() {
    this.isLoadingHistory.set(true);
    this.historyPage.set(1);

    this.payoutRequestService.getLpHistory({ page: 1, limit: 10 }).subscribe({
      next: (response) => {
        this.historyItems.set(response.items);
        this.historyHasMore.set(response.has_more);
        this.isLoadingHistory.set(false);
      },
      error: (error) => {
        console.error('Error loading history:', error);
        this.isLoadingHistory.set(false);
        this.showError(this.getErrorMessage(error));
      }
    });
  }

  toggleHistoryChat(id: string) {
    this.expandedChatId.update(current => current === id ? null : id);
  }

  loadMoreHistory() {
    const nextPage = this.historyPage() + 1;
    this.isLoadingHistory.set(true);

    this.payoutRequestService.getLpHistory({ page: nextPage, limit: 10 }).subscribe({
      next: (response) => {
        this.historyItems.update(items => [...items, ...response.items]);
        this.historyPage.set(nextPage);
        this.historyHasMore.set(response.has_more);
        this.isLoadingHistory.set(false);
      },
      error: (error) => {
        console.error('Error loading more history:', error);
        this.isLoadingHistory.set(false);
      }
    });
  }

  // ============================================
  // Polling
  // ============================================

  private startPolling() {
    this.stopPolling();
    this.activeOrderPolling = interval(this.POLLING_INTERVAL).subscribe(() => {
      const order = this.activeOrder();
      if (!order) {
        this.stopPolling();
        return;
      }

      this.payoutRequestService.getById(order.id).subscribe({
        next: (updated) => {
          // If order was reassigned (timeout), go back to queue
          if (updated.status !== PayoutRequestStatus.LpAssigned) {
            this.activeOrder.set(null);
            this.stopPolling();
            this.showError('O tempo para pagamento expirou. A ordem voltou para a fila.');
            this.loadQueue();
          } else {
            this.activeOrder.set(updated);
          }
        },
        error: () => {} // Silently ignore polling errors
      });
    });
  }

  private stopPolling() {
    if (this.activeOrderPolling) {
      this.activeOrderPolling.unsubscribe();
      this.activeOrderPolling = undefined;
    }
  }

  // ============================================
  // BTC Ledger
  // ============================================

  loadLedger() {
    this.isLoadingLedger.set(true);
    this.ledgerPage.set(1);

    this.payoutRequestService.getLedger({ page: 1, limit: 10 }).subscribe({
      next: (response) => {
        this.ledgerItems.set(response.items);
        this.ledgerHasMore.set(response.has_more);
        this.isLoadingLedger.set(false);
      },
      error: (error) => {
        console.error('Error loading ledger:', error);
        this.isLoadingLedger.set(false);
        this.showError(this.getErrorMessage(error));
      }
    });
  }

  loadMoreLedger() {
    const nextPage = this.ledgerPage() + 1;
    this.isLoadingLedger.set(true);

    this.payoutRequestService.getLedger({ page: nextPage, limit: 10 }).subscribe({
      next: (response) => {
        this.ledgerItems.update(items => [...items, ...response.items]);
        this.ledgerPage.set(nextPage);
        this.ledgerHasMore.set(response.has_more);
        this.isLoadingLedger.set(false);
      },
      error: (error) => {
        console.error('Error loading more ledger:', error);
        this.isLoadingLedger.set(false);
      }
    });
  }

  // ============================================
  // BTC Convert & Withdraw
  // ============================================

  onConvertBalance(cents: number) {
    this.isConvertingBalance.set(true);

    this.payoutRequestService.convertBalance(cents).subscribe({
      next: () => {
        this.isConvertingBalance.set(false);
        this.showConvertModal.set(false);
        this.showSuccess('Saldo convertido para BTC com sucesso!');
        this.loadStats();
        if (this.currentTab() === 'btc') {
          this.loadLedger();
        }
      },
      error: (error) => {
        console.error('Error converting balance:', error);
        this.isConvertingBalance.set(false);
        this.showError(this.getErrorMessage(error));
      }
    });
  }

  onWithdrawBtc(sats: number) {
    this.isWithdrawingBtc.set(true);

    this.payoutRequestService.withdrawBtc(sats).subscribe({
      next: () => {
        this.isWithdrawingBtc.set(false);
        this.showWithdrawModal.set(false);
        this.showSuccess('Saque de BTC realizado com sucesso!');
        this.loadStats();
        if (this.currentTab() === 'btc') {
          this.loadLedger();
        }
      },
      error: (error) => {
        console.error('Error withdrawing BTC:', error);
        this.isWithdrawingBtc.set(false);
        this.showError(this.getErrorMessage(error));
      }
    });
  }

  // ============================================
  // Helpers
  // ============================================

  formatBrlCents = formatBrlCents;
  formatSats = formatSats;
  formatSatsToBtc = formatSatsToBtc;
  formatDateTime = formatDateTime;

  formatBrlCentsSigned(cents: number): string {
    const prefix = cents < 0 ? '-' : '';
    return prefix + formatBrlCents(Math.abs(cents));
  }

  getEffectiveBalance(stats: LpStats): number {
    return stats.balance_cents - stats.advance_cents;
  }

  getStatusLabel(status: string): string {
    return getPayoutRequestStatusLabel(status as any);
  }

  getStatusClass(status: string): string {
    return getPayoutRequestStatusClass(status as any);
  }

  getSourceLabel(sourceType: string): string {
    return getSourceTypeLabel(sourceType as any);
  }

  getLedgerEntryLabel(entryType: string): string {
    return getLedgerEntryTypeLabel(entryType as any);
  }

  getLedgerEntryClass(entryType: string): string {
    return getLedgerEntryTypeClass(entryType as any);
  }

  private getErrorMessage(error: any): string {
    if (error?.message?.includes('cancelada') || error?.message?.includes('cancelled') || error?.message?.includes('User denied')) {
      return 'Assinatura cancelada pelo usuario.';
    }
    if (error?.error?.error) return error.error.error;
    if (error?.message) return error.message;
    return 'Ocorreu um erro. Tente novamente.';
  }

  private showSuccess(msg: string) {
    this.successMessage.set(msg);
    this.errorMessage.set('');
    setTimeout(() => this.successMessage.set(''), 5000);
  }

  private showError(msg: string) {
    this.errorMessage.set(msg);
    this.successMessage.set('');
    setTimeout(() => this.errorMessage.set(''), 8000);
  }

  private clearMessages() {
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  // ============================================
  // Bank Setup Update
  // ============================================

  openUpdateConfirm() {
    this.showUpdateConfirm.set(true);
  }

  cancelUpdateConfirm() {
    this.showUpdateConfirm.set(false);
  }

  confirmUpdate() {
    this.showUpdateConfirm.set(false);
    this.showBankSetup.set(true);
  }

  onBankSetupSuccess() {
    this.showBankSetup.set(false);
    this.accountValidationService.clearAccountCache();
    this.showSuccess('Credenciais bancarias atualizadas com sucesso!');
  }

  onBankSetupComplete() {
    this.showBankSetup.set(false);
  }

  onBankSetupCancelled() {
    this.showBankSetup.set(false);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}

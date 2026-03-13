import { Component, inject, signal, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';

import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { PixPayoutRequestService } from '../../shared/api/pix-payout-request.service';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { QuoteService } from '../../shared/api/quote.service';
import { BankSetupComponent } from '../../components/bank-setup/bank-setup.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { StatusSheetComponent } from '../../components/status-sheet/status-sheet.component';
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
import { LpConvertModalComponent } from './components/lp-convert-modal.component';
import { LpWithdrawModalComponent } from './components/lp-withdraw-modal.component';
import { MessageChatComponent } from '../../components/order-status/components/message-chat/message-chat.component';
import { formatBrlCents, formatSats, formatSatsToBtc, formatDateTime } from '../../shared/utils/format.util';

@Component({
  selector: 'app-lp-dashboard',
  standalone: true,
  imports: [
    LpQueueCardComponent,
    LpActiveOrderComponent,
    BankSetupComponent,
    MessageChatComponent,
    LpConvertModalComponent,
    LpWithdrawModalComponent,
    PageHeaderComponent,
    StatusSheetComponent
  ],
  templateUrl: './lp-dashboard.component.html',
  styleUrls: ['./lp-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class LpDashboardComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private payoutRequestService = inject(PixPayoutRequestService);
  private accountValidationService = inject(AccountValidationService);
  private quoteService = inject(QuoteService);

  // Tabs — 3 tabs: orders, history, ledger
  currentTab = signal<'orders' | 'history' | 'ledger'>('orders');

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

  // Accept Confirmation
  pendingAcceptOrderId = signal<string | null>(null);
  acceptTermsChecked = signal(false);

  // History
  historyItems = signal<PixPayoutRequest[]>([]);
  isLoadingHistory = signal(false);
  historyPage = signal(1);
  historyHasMore = signal(false);

  // Sheets (replaces modal signals)
  activeSheet = signal<'convert' | 'withdraw' | 'credentials' | null>(null);
  isSheetProcessing = signal(false);

  // BTC Ledger
  ledgerItems = signal<LpLedgerEntry[]>([]);
  isLoadingLedger = signal(false);
  ledgerPage = signal(1);
  ledgerHasMore = signal(false);

  // Bank Setup
  showBankSetup = signal(false);

  // History Chat
  expandedChatId = signal<string | null>(null);

  // Feedback
  successMessage = signal('');
  errorMessage = signal('');

  // BTC Price
  btcPriceCents = signal<number>(0);

  // Polling
  private activeOrderPolling?: Subscription;
  private queuePolling?: Subscription;
  private readonly POLLING_INTERVAL = 10000;

  ngOnInit() {
    this.loadStats();
    this.loadBtcPrice();
  }

  ngOnDestroy() {
    this.stopPolling();
    this.stopQueuePolling();
  }

  // ============================================
  // Tab Navigation
  // ============================================

  switchTab(tab: 'orders' | 'history' | 'ledger') {
    this.currentTab.set(tab);
    this.clearMessages();

    switch (tab) {
      case 'orders':
        if (this.queueItems().length === 0 && !this.isLoadingQueue()) {
          this.loadQueue();
        }
        break;
      case 'history':
        if (this.historyItems().length === 0) {
          this.loadHistory();
        }
        break;
      case 'ledger':
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
        this.startQueuePolling();
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

  onRequestAcceptOrder(orderId: string) {
    this.pendingAcceptOrderId.set(orderId);
    this.acceptTermsChecked.set(false);
  }

  onCancelAcceptOrder() {
    this.pendingAcceptOrderId.set(null);
    this.acceptTermsChecked.set(false);
  }

  onConfirmAcceptOrder() {
    const orderId = this.pendingAcceptOrderId();
    if (!orderId) return;
    this.pendingAcceptOrderId.set(null);
    this.acceptTermsChecked.set(false);
    this.onAcceptOrder(orderId);
  }

  getPendingAcceptItem(): PixPayoutRequest | null {
    const id = this.pendingAcceptOrderId();
    if (!id) return null;
    return this.queueItems().find(i => i.id === id) ?? null;
  }

  onAcceptOrder(orderId: string) {
    this.isAcceptingOrderId.set(orderId);
    this.clearMessages();

    this.payoutRequestService.acceptRequest(orderId).subscribe({
      next: (request) => {
        this.activeOrder.set(request);
        this.isAcceptingOrderId.set(null);
        this.queueItems.update(items => items.filter(i => i.id !== orderId));
        this.stopQueuePolling();
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

  onPayOrder() {
    const order = this.activeOrder();
    if (!order) return;

    this.isProcessingAction.set(true);
    this.processingActionType.set('pay');
    this.clearMessages();

    this.payoutRequestService.payRequest(order.id).subscribe({
      next: () => {
        this.isProcessingAction.set(false);
        this.processingActionType.set('');
        this.activeOrder.set(null);
        this.stopPolling();
        this.showSuccess('Pagamento confirmado com sucesso! Crédito BRL adicionado.');
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
        this.showSuccess('Problema reportado. A ordem será analisada pela administração.');
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

  private startQueuePolling() {
    this.stopQueuePolling();
    this.queuePolling = interval(this.POLLING_INTERVAL).subscribe(() => {
      this.payoutRequestService.getQueue({ page: 1, limit: 10 }).subscribe({
        next: (response) => {
          this.queueItems.set(response.items);
          this.queueHasMore.set(response.has_more);
          this.queuePage.set(1);
        },
        error: () => {}
      });
    });
  }

  private stopQueuePolling() {
    this.queuePolling?.unsubscribe();
    this.queuePolling = undefined;
  }

  // ============================================
  // BTC Price
  // ============================================

  private loadBtcPrice() {
    this.quoteService.getBtcPrice().subscribe({
      next: (r) => this.btcPriceCents.set(parseInt(r.price, 10)),
      error: () => {}
    });
  }

  satsToBrl(sats: number): string {
    const price = this.btcPriceCents();
    if (!price || !sats) return 'R$ 0,00';
    const brlCents = Math.round((sats / 100_000_000) * price);
    return formatBrlCents(brlCents);
  }

  formatBtcPriceBrl(): string {
    return formatBrlCents(this.btcPriceCents());
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
    this.isSheetProcessing.set(true);

    this.payoutRequestService.convertBalance(cents).subscribe({
      next: () => {
        this.isSheetProcessing.set(false);
        this.activeSheet.set(null);
        this.showSuccess('Saldo convertido para Bitcoin com sucesso!');
        this.loadStats();
        if (this.currentTab() === 'ledger') {
          this.loadLedger();
        }
      },
      error: (error) => {
        console.error('Error converting balance:', error);
        this.isSheetProcessing.set(false);
        this.showError(this.getErrorMessage(error));
      }
    });
  }

  onWithdrawBtc(sats: number) {
    this.isSheetProcessing.set(true);

    this.payoutRequestService.withdrawBtc(sats).subscribe({
      next: () => {
        this.isSheetProcessing.set(false);
        this.activeSheet.set(null);
        this.showSuccess('Saque de Bitcoin realizado com sucesso!');
        this.loadStats();
        if (this.currentTab() === 'ledger') {
          this.loadLedger();
        }
      },
      error: (error) => {
        console.error('Error withdrawing BTC:', error);
        this.isSheetProcessing.set(false);
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
      return 'Assinatura cancelada pelo usuário.';
    }
    if (error?.status === 409) {
      return 'Seu crédito está temporariamente bloqueado enquanto um pagamento está sendo processado. Tente novamente em alguns minutos.';
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

  openUpdateSheet() {
    this.activeSheet.set('credentials');
  }

  confirmUpdate() {
    this.activeSheet.set(null);
    this.showBankSetup.set(true);
  }

  onBankSetupSuccess() {
    this.showBankSetup.set(false);
    this.accountValidationService.clearAccountCache();
    this.showSuccess('Credenciais bancárias atualizadas com sucesso!');
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

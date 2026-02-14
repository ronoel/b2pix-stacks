import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { PixPayoutRequestService } from '../../shared/api/pix-payout-request.service';
import {
  PixPayoutRequest,
  LpStats,
  PayoutRequestStatus,
  getPayoutRequestStatusLabel,
  getPayoutRequestStatusClass,
  getSourceTypeLabel
} from '../../shared/models/pix-payout-request.model';
import { LpQueueCardComponent } from './components/lp-queue-card.component';
import { LpActiveOrderComponent } from './components/lp-active-order.component';

@Component({
  selector: 'app-lp-dashboard',
  standalone: true,
  imports: [CommonModule, LpQueueCardComponent, LpActiveOrderComponent],
  templateUrl: './lp-dashboard.component.html',
  styleUrls: ['./lp-dashboard.component.scss']
})
export class LpDashboardComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private payoutRequestService = inject(PixPayoutRequestService);

  // Tabs
  currentTab = signal<'queue' | 'history' | 'stats'>('queue');

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

  switchTab(tab: 'queue' | 'history' | 'stats') {
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

        // If LP has an active order, fetch it from history
        if (stats.active_order_count > 0) {
          this.loadActiveOrderFromHistory();
        } else {
          this.loadQueue();
        }
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
  // Helpers
  // ============================================

  formatBrlCents(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(cents / 100);
  }

  formatSats(amount: number): string {
    return new Intl.NumberFormat('pt-BR').format(amount);
  }

  formatDateTime(dateString: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
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

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}

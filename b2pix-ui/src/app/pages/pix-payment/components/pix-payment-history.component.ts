import { Component, inject, signal, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletManagerService } from '../../../libs/wallet/wallet-manager.service';
import { PixPaymentService } from '../../../shared/api/pix-payment.service';
import {
  PixPaymentOrder,
  PixPaymentStatus,
  getPixPaymentStatusLabel,
  getPixPaymentStatusClass
} from '../../../shared/models/pix-payment.model';

@Component({
  selector: 'app-pix-payment-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pix-payment-history.component.html',
  styleUrls: ['./pix-payment-history.component.scss']
})
export class PixPaymentHistoryComponent implements OnInit {
  private walletManager = inject(WalletManagerService);
  private pixPaymentService = inject(PixPaymentService);

  viewOrder = output<string>();

  pixPayments = signal<PixPaymentOrder[]>([]);
  isLoadingHistory = signal(false);
  isLoadingMore = signal(false);
  hasMoreOrders = signal(false);
  currentPage = signal(1);

  ngOnInit() {
    this.loadPayments();
  }

  loadPayments() {
    const address = this.walletManager.getSTXAddress();
    if (!address) return;

    this.isLoadingHistory.set(true);
    this.pixPaymentService.getPixPaymentsByAddress(address, { page: 1, limit: 5 }).subscribe({
      next: (response) => {
        this.pixPayments.set(response.items);
        this.hasMoreOrders.set(response.has_more);
        this.currentPage.set(1);
        this.isLoadingHistory.set(false);
      },
      error: (error) => {
        console.error('Error loading PIX payments:', error);
        this.isLoadingHistory.set(false);
      }
    });
  }

  loadMorePayments() {
    const address = this.walletManager.getSTXAddress();
    if (!address) return;

    const nextPage = this.currentPage() + 1;
    this.isLoadingMore.set(true);

    this.pixPaymentService.getPixPaymentsByAddress(address, { page: nextPage, limit: 5 }).subscribe({
      next: (response) => {
        this.pixPayments.update(items => [...items, ...response.items]);
        this.hasMoreOrders.set(response.has_more);
        this.currentPage.set(nextPage);
        this.isLoadingMore.set(false);
      },
      error: (error) => {
        console.error('Error loading more PIX payments:', error);
        this.isLoadingMore.set(false);
      }
    });
  }

  refreshPayments() {
    this.loadPayments();
  }

  onViewOrder(payment: PixPaymentOrder) {
    this.viewOrder.emit(payment.id);
  }

  getStatusLabel(status: PixPaymentStatus): string {
    return getPixPaymentStatusLabel(status);
  }

  getStatusClass(status: PixPaymentStatus): string {
    return getPixPaymentStatusClass(status);
  }

  formatBrlCents(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
}

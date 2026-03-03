import { Component, inject, signal, output, OnInit } from '@angular/core';

import { WalletManagerService } from '../../../libs/wallet/wallet-manager.service';
import { PixPaymentService } from '../../../shared/api/pix-payment.service';
import {
  PixPaymentOrder,
  OrderStatus,
  getOrderStatusLabel,
  getOrderStatusClass
} from '../../../shared/models/pix-payment.model';
import { formatBrlCents, formatSats, formatDateTime } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-pix-payment-history',
  standalone: true,
  imports: [],
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

  getStatusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status);
  }

  getStatusClass(status: OrderStatus): string {
    return getOrderStatusClass(status);
  }

  formatBrlCents = formatBrlCents;
  formatSats = formatSats;
  formatDateTime = formatDateTime;
}

import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { WalletManagerService } from '../../../libs/wallet/wallet-manager.service';
import { BuyOrderService } from '../../../shared/api/buy-order.service';
import {
  BuyOrder,
  BuyOrderStatus,
  getBuyOrderStatusLabel,
  getBuyOrderStatusClass
} from '../../../shared/models/buy-order.model';
import { formatBrlCents, formatSats, formatDateTime } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-buy-history',
  standalone: true,
  imports: [],
  templateUrl: './buy-history.component.html',
  styleUrl: './buy-history.component.scss'
})
export class BuyHistoryComponent implements OnInit {
  private router = inject(Router);
  private walletManagerService = inject(WalletManagerService);
  private buyOrderService = inject(BuyOrderService);

  buyOrders = signal<BuyOrder[]>([]);
  isLoadingHistory = signal(false);
  isLoadingMore = signal(false);
  hasMoreOrders = signal(false);
  currentPage = signal(1);

  ngOnInit() {
    this.loadBuyOrders();
  }

  loadBuyOrders() {
    const address = this.walletManagerService.getSTXAddress();
    if (address) {
      this.isLoadingHistory.set(true);
      this.buyOrderService.getBuyOrdersByAddress(address, {
        page: 1,
        limit: 5
      }).subscribe({
        next: (response) => {
          this.buyOrders.set(response.buy_orders);
          this.hasMoreOrders.set(response.has_more);
          this.currentPage.set(1);
          this.isLoadingHistory.set(false);
        },
        error: (error) => {
          console.error('Error loading buy orders:', error);
          this.isLoadingHistory.set(false);
        }
      });
    }
  }

  loadMoreOrders() {
    const address = this.walletManagerService.getSTXAddress();
    if (address) {
      const nextPage = this.currentPage() + 1;
      this.isLoadingMore.set(true);
      this.buyOrderService.getBuyOrdersByAddress(address, {
        page: nextPage,
        limit: 5
      }).subscribe({
        next: (response) => {
          this.buyOrders.set([...this.buyOrders(), ...response.buy_orders]);
          this.hasMoreOrders.set(response.has_more);
          this.currentPage.set(nextPage);
          this.isLoadingMore.set(false);
        },
        error: (error) => {
          console.error('Error loading more buy orders:', error);
          this.isLoadingMore.set(false);
        }
      });
    }
  }

  viewOrderDetails(order: BuyOrder) {
    this.router.navigate(['/buy', order.id]);
  }

  getStatusLabel = getBuyOrderStatusLabel;
  getStatusClass = getBuyOrderStatusClass;
  formatBrlCents = formatBrlCents;
  formatSats = formatSats;
  formatDateTime = formatDateTime;
}

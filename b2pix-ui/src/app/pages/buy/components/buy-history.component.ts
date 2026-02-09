import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WalletManagerService } from '../../../libs/wallet/wallet-manager.service';
import { BuyOrderService } from '../../../shared/api/buy-order.service';
import { BuyOrder, BuyOrderStatus } from '../../../shared/models/buy-order.model';

@Component({
  selector: 'app-buy-history',
  standalone: true,
  imports: [CommonModule],
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

  getStatusLabel(status: BuyOrderStatus): string {
    switch (status) {
      case BuyOrderStatus.Created:
        return 'Pendente';
      case BuyOrderStatus.Processing:
        return 'Verificando Pagamento';
      case BuyOrderStatus.Analyzing:
        return 'Em Análise';
      case BuyOrderStatus.Confirmed:
        return 'Confirmado';
      case BuyOrderStatus.Rejected:
        return 'Rejeitado';
      case BuyOrderStatus.Canceled:
        return 'Cancelado';
      case BuyOrderStatus.Expired:
        return 'Expirado';
      default:
        return 'Pendente';
    }
  }

  getStatusClass(status: BuyOrderStatus): string {
    switch (status) {
      case BuyOrderStatus.Confirmed:
        return 'completed';
      case BuyOrderStatus.Created:
        return 'pending';
      case BuyOrderStatus.Processing:
        return 'processing';
      case BuyOrderStatus.Analyzing:
        return 'processing';
      case BuyOrderStatus.Rejected:
      case BuyOrderStatus.Canceled:
      case BuyOrderStatus.Expired:
        return 'warning';
      default:
        return 'pending';
    }
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
}

import { Component, inject, OnInit, signal } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { BuyOrderService } from '../../shared/api/buy-order.service';
import { BuyOrder, BuyOrderStatus } from '../../shared/models/buy-order.model';
import { formatBrlCents } from '../../shared/utils/format.util';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
@Component({
  selector: 'app-analyzing-order',
  standalone: true,
  imports: [PageHeaderComponent],
  templateUrl: './dispute-details.component.html',
  styleUrl: './dispute-details.component.scss'
})
export class AnalyzingOrderComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private buyOrderService = inject(BuyOrderService);

  // Signals
  order = signal<BuyOrder | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  resolving = signal(false);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const orderId = params['id'];
      if (orderId) {
        this.loadOrderDetails(orderId);
      } else {
        this.error.set('ID da ordem não encontrado');
        this.loading.set(false);
      }
    });
  }

  loadOrderDetails(orderId?: string) {
    this.loading.set(true);
    this.error.set(null);

    const id = orderId || this.route.snapshot.params['id'];
    if (!id) {
      this.error.set('ID da ordem não encontrado');
      this.loading.set(false);
      return;
    }

    this.buyOrderService.getBuyOrderById(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading order details:', error);
        this.error.set('Erro ao carregar detalhes da ordem. Tente novamente.');
        this.loading.set(false);
      }
    });
  }

  resolveOrder(resolution: 'confirmed' | 'rejected') {
    const currentOrder = this.order();
    if (!currentOrder || this.resolving()) return;

    this.resolving.set(true);

    this.buyOrderService.resolveAnalyzingOrder(currentOrder.id, resolution).subscribe({
      next: (updatedOrder) => {
        this.order.set(updatedOrder);
        this.resolving.set(false);
        this.router.navigate(['/order-analysis']);
      },
      error: (error) => {
        console.error('Error resolving order:', error);
        this.resolving.set(false);
        this.error.set('Erro ao resolver ordem. Tente novamente.');
      }
    });
  }

  goBack() {
    this.router.navigate(['/order-analysis']);
  }

  getStatusText(status: BuyOrderStatus): string {
    switch (status) {
      case BuyOrderStatus.Analyzing:
        return 'Em análise';
      case BuyOrderStatus.Confirmed:
        return 'Confirmada';
      case BuyOrderStatus.Rejected:
        return 'Rejeitada';
      default:
        return status;
    }
  }

  formatCurrency(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return 'R$ 0,00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return formatBrlCents(numValue);
  }

  formatBitcoin(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '0.00000000';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return (numValue / 100000000).toFixed(8);
  }

  formatAddress(address: string): string {
    if (address.length <= 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
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

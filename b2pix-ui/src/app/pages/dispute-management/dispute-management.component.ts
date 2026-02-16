import { Component, inject, OnInit, ViewEncapsulation, signal } from '@angular/core';

import { Router } from '@angular/router';
import { BuyOrderService } from '../../shared/api/buy-order.service';
import { BuyOrder, BuyOrderStatus } from '../../shared/models/buy-order.model';

@Component({
  selector: 'app-order-analysis',
  standalone: true,
  imports: [],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './dispute-management.component.html',
  styleUrl: './dispute-management.component.scss'
})
export class OrderAnalysisComponent implements OnInit {
  private router = inject(Router);
  private buyOrderService = inject(BuyOrderService);

  // Signals
  analyzingOrders = signal<BuyOrder[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadAnalyzingOrders();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  loadAnalyzingOrders() {
    this.loading.set(true);
    this.error.set(null);

    this.buyOrderService.getAnalyzingOrders().subscribe({
      next: (orders) => {
        this.analyzingOrders.set(orders);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading analyzing orders:', error);
        this.error.set('Erro ao carregar ordens em análise. Tente novamente.');
        this.loading.set(false);
      }
    });
  }

  viewOrderDetails(orderId: string) {
    this.router.navigate(['/analyzing-order', orderId]);
  }

  getStatusText(status: BuyOrderStatus): string {
    return status === BuyOrderStatus.Analyzing ? 'Em Análise' : status;
  }

  formatCurrency(value: string | number): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    // Value is already in cents, convert to BRL by dividing by 100
    const valueInBRL = numValue / 100;
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valueInBRL);
  }

  formatBitcoin(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
      return '0.00000000';
    }
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

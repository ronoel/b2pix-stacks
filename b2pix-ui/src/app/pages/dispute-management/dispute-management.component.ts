import { Component, inject, OnInit, signal } from '@angular/core';

import { Router } from '@angular/router';
import { PixInboundService } from '../../shared/api/pix-inbound.service';
import { PixInboundRequestResponse, getPixInboundStatusLabel, getSourceTypeLabel } from '../../shared/models/pix-inbound.model';
import { formatBrlCents } from '../../shared/utils/format.util';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';

@Component({
  selector: 'app-order-analysis',
  standalone: true,
  imports: [PageHeaderComponent],
  templateUrl: './dispute-management.component.html',
  styleUrl: './dispute-management.component.scss'
})
export class OrderAnalysisComponent implements OnInit {
  private router = inject(Router);
  private pixInboundService = inject(PixInboundService);

  // Signals
  analyzingOrders = signal<PixInboundRequestResponse[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadAnalyzingOrders();
  }

  goBack() {
    this.router.navigate(['/manager-dashboard']);
  }

  loadAnalyzingOrders() {
    this.loading.set(true);
    this.error.set(null);

    this.pixInboundService.getAnalyzingRequests().subscribe({
      next: (requests) => {
        this.analyzingOrders.set(requests);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading analyzing requests:', error);
        this.error.set('Erro ao carregar ordens em análise. Tente novamente.');
        this.loading.set(false);
      }
    });
  }

  viewOrderDetails(orderId: string) {
    this.router.navigate(['/analyzing-order', orderId]);
  }

  getStatusText(status: string): string {
    return getPixInboundStatusLabel(status);
  }

  getSourceTypeLabel(sourceType: string): string {
    return getSourceTypeLabel(sourceType);
  }

  formatCurrency(value: string | number): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return formatBrlCents(numValue);
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

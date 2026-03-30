import { Component, inject, OnInit, signal } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { PixInboundService } from '../../shared/api/pix-inbound.service';
import { PixInboundRequestResponse, BankPixQueryResponse, BankPixTransaction, getPixInboundStatusLabel, getSourceTypeLabel } from '../../shared/models/pix-inbound.model';
import { formatBrlCents } from '../../shared/utils/format.util';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { ConfirmActionSheetComponent } from '../../components/confirm-action-sheet/confirm-action-sheet.component';

@Component({
  selector: 'app-analyzing-order',
  standalone: true,
  imports: [PageHeaderComponent, ConfirmActionSheetComponent],
  templateUrl: './dispute-details.component.html',
  styleUrl: './dispute-details.component.scss'
})
export class AnalyzingOrderComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private pixInboundService = inject(PixInboundService);

  // Signals
  order = signal<PixInboundRequestResponse | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  resolving = signal(false);
  showConfirmApprove = signal(false);
  showConfirmReject = signal(false);
  pixEndToEndId = signal('');

  // Bank PIX query
  bankPixData = signal<BankPixQueryResponse | null>(null);
  bankPixLoading = signal(false);
  bankPixError = signal<string | null>(null);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const orderId = params['id'];
      if (orderId) {
        this.loadOrderDetails(orderId);
      } else {
        this.error.set('ID não encontrado');
        this.loading.set(false);
      }
    });
  }

  loadOrderDetails(orderId?: string) {
    this.loading.set(true);
    this.error.set(null);

    const id = orderId || this.route.snapshot.params['id'];
    if (!id) {
      this.error.set('ID não encontrado');
      this.loading.set(false);
      return;
    }

    // The analyzing list already contains all the data we need.
    // Re-fetch the full list and find this specific item.
    this.pixInboundService.getAnalyzingRequests().subscribe({
      next: (requests) => {
        const found = requests.find(r => r.id === id);
        if (found) {
          this.order.set(found);
          if (found.pix_end_to_end_id) {
            this.pixEndToEndId.set(found.pix_end_to_end_id);
          }
        } else {
          this.error.set('Solicitação não encontrada na lista de análise.');
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading order details:', error);
        this.error.set('Erro ao carregar detalhes. Tente novamente.');
        this.loading.set(false);
      }
    });
  }

  resolveOrder(resolution: 'confirmed' | 'rejected') {
    const currentOrder = this.order();
    if (!currentOrder || this.resolving()) return;

    this.resolving.set(true);
    this.error.set(null);

    const e2eId = resolution === 'confirmed' ? this.pixEndToEndId().trim() || undefined : undefined;

    this.pixInboundService.resolveAnalyzingRequest(currentOrder.id, resolution, e2eId).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.resolving.set(false);
        this.router.navigate(['/order-analysis']);
      },
      error: (error) => {
        console.error('Error resolving:', error);
        this.resolving.set(false);
        this.showConfirmApprove.set(false);
        this.error.set(error.message || 'Erro ao resolver. Tente novamente.');
      }
    });
  }

  loadBankPix() {
    const currentOrder = this.order();
    if (!currentOrder || this.bankPixLoading()) return;

    this.bankPixLoading.set(true);
    this.bankPixError.set(null);

    this.pixInboundService.getBankPix(currentOrder.id).subscribe({
      next: (data) => {
        this.bankPixData.set(data);
        this.bankPixLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading bank PIX:', err);
        this.bankPixError.set(err.error?.error || 'Erro ao consultar PIX no banco.');
        this.bankPixLoading.set(false);
      }
    });
  }

  isPixMatch(pix: BankPixTransaction): boolean {
    const order = this.order();
    if (!order) return false;
    const expectedValue = this.bankPixData()?.expected_value;
    return pix.valor === expectedValue && pix.chave === order.pix_key;
  }

  isValueMatch(pix: BankPixTransaction): boolean {
    return pix.valor === this.bankPixData()?.expected_value;
  }

  isKeyMatch(pix: BankPixTransaction): boolean {
    const order = this.order();
    return !!order && pix.chave === order.pix_key;
  }

  formatBrl(value: string): string {
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  }

  goBack() {
    this.router.navigate(['/order-analysis']);
  }

  getStatusText(status: string): string {
    return getPixInboundStatusLabel(status);
  }

  getSourceTypeLabel(sourceType: string): string {
    return getSourceTypeLabel(sourceType);
  }

  formatCurrency(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return 'R$ 0,00';
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

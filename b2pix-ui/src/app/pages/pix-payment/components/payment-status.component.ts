import { Component, inject, input, OnInit, OnDestroy, signal } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { PixPaymentService } from '../../../shared/api/pix-payment.service';
import {
  PixPaymentOrder,
  OrderStatus,
  getOrderStatusLabel,
  getOrderStatusClass
} from '../../../shared/models/pix-payment.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-payment-status',
  standalone: true,
  imports: [],
  templateUrl: './payment-status.component.html',
  styleUrl: './payment-status.component.scss'
})
export class PaymentStatusComponent implements OnInit, OnDestroy {
  orderId = input.required<string>();

  private pixPaymentService = inject(PixPaymentService);
  private refreshSubscription?: Subscription;
  private readonly REFRESH_INTERVAL = 5000;

  order = signal<PixPaymentOrder | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadOrder();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  loadOrder() {
    const id = this.orderId();
    if (!id) return;

    this.isLoading.set(true);
    this.error.set(null);

    this.pixPaymentService.getPixPaymentById(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.isLoading.set(false);

        if (!order.is_final) {
          this.startAutoRefresh(id);
        } else {
          this.stopAutoRefresh();
        }
      },
      error: (err) => {
        console.error('Error loading PIX payment:', err);
        this.error.set('Erro ao carregar detalhes do pagamento');
        this.isLoading.set(false);
      }
    });
  }

  private startAutoRefresh(orderId: string) {
    this.stopAutoRefresh();
    this.refreshSubscription = interval(this.REFRESH_INTERVAL).subscribe(() => {
      this.pixPaymentService.getPixPaymentById(orderId).subscribe({
        next: (order) => {
          this.order.set(order);
          if (order.is_final) {
            this.stopAutoRefresh();
          }
        },
        error: (err) => {
          console.error('Error refreshing PIX payment:', err);
        }
      });
    });
  }

  private stopAutoRefresh() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  isOrderFinal(): boolean {
    const o = this.order();
    return o ? o.is_final : false;
  }

  getStatusLabel(status: OrderStatus): string {
    return getOrderStatusLabel(status);
  }

  getStatusClass(status: OrderStatus): string {
    return getOrderStatusClass(status);
  }

  getStatusDescription(status: OrderStatus): string {
    switch (status) {
      case 'broadcasted':
        return 'A transação foi transmitida e está aguardando confirmação na blockchain.';
      case 'awaiting_confirmation':
        return 'Aguardando confirmação na blockchain. Isso pode levar alguns minutos.';
      case 'confirmed':
        return 'Transação confirmada na blockchain! Preparando liquidação.';
      case 'settlement_created':
        return 'Liquidação criada. Um Liquidity Provider está processando o pagamento PIX.';
      case 'completed':
        return 'Pagamento PIX concluído com sucesso!';
      case 'pending':
        return 'Ordem pendente.';
      case 'failed':
        return 'Ocorreu um erro durante o processamento.';
      case 'error':
        return 'Ocorreu um problema durante o pagamento. Em análise.';
      case 'expired':
        return 'A ordem expirou sem ser processada. Reembolso em andamento.';
      case 'refunded':
        return 'O pagamento falhou e seus satoshis foram devolvidos.';
      default:
        return '';
    }
  }

  // 4-step stepper logic
  private getStepNumber(status: OrderStatus): number {
    switch (status) {
      case 'broadcasted':
      case 'awaiting_confirmation':
        return 1;
      case 'confirmed':
        return 2;
      case 'settlement_created':
        return 3;
      case 'completed':
        return 4;
      default:
        return 0;
    }
  }

  isStepCompleted(step: number): boolean {
    const o = this.order();
    if (!o) return false;
    return this.getStepNumber(o.status) >= step;
  }

  isStepActive(step: number): boolean {
    const o = this.order();
    if (!o) return false;
    if (this.isErrorStatus(o.status)) {
      return step === 4;
    }
    return this.getStepNumber(o.status) === step;
  }

  isErrorStatus(status: OrderStatus): boolean {
    return status === 'failed' || status === 'error' || status === 'expired' || status === 'refunded';
  }

  getLastStepLabel(status: OrderStatus): string {
    switch (status) {
      case 'failed':
      case 'error':
        return 'Falhou';
      case 'expired':
        return 'Expirada';
      case 'refunded':
        return 'Reembolsado';
      default:
        return 'Pago';
    }
  }

  formatSats(amount: number): string {
    return new Intl.NumberFormat('pt-BR').format(amount);
  }

  formatBrlCents(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100);
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

  formatTxHash(txHash: string): string {
    if (!txHash || txHash.length <= 16) return txHash;
    return `${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 8)}`;
  }

  getExplorerUrl(txHash: string): string {
    const tx = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
    const chain = environment.network === 'mainnet' ? 'mainnet' : 'testnet';
    return `https://explorer.hiro.so/txid/${tx}?chain=${chain}`;
  }
}

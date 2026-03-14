import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { OrderStatusComponent } from '../../components/order-status/order-status.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { PayoutSourceType } from '../../shared/models/pix-payout-request.model';

@Component({
  selector: 'app-payment-details',
  standalone: true,
  imports: [OrderStatusComponent, PageHeaderComponent],
  template: `
    <div class="payment-details-page">
      <div class="container">
        <app-page-header
          title="Detalhes do pagamento"
          subtitle="Acompanhe o status do pagamento PIX"
          [backRoute]="backRoute"
        />

        @if (orderId()) {
          <app-order-status
            [orderId]="orderId()!"
            [sourceType]="sourceType"
            detailsTitle="Detalhes do pagamento PIX"
            [refreshInterval]="10000"
          />

          <div class="actions">
            <button class="btn btn-outline btn-full" (click)="goBack()">
              Voltar
            </button>
          </div>
        } @else {
          <div class="error-state">
            <h3>ID do pagamento não encontrado</h3>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .payment-details-page {
      min-height: 100vh;
      background: var(--bg-secondary);
      padding: 0 0 100px;
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 64px 20px;
      text-align: center;

      h3 {
        font-size: 20px;
        color: var(--text-primary);
        margin: 0;
      }
    }

    .actions {
      margin-top: 24px;
    }
  `]
})
export class PaymentDetailsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  orderId = signal<string | null>(null);
  sourceType!: PayoutSourceType;
  backRoute!: string;

  ngOnInit() {
    this.orderId.set(this.route.snapshot.paramMap.get('id'));
    this.sourceType = this.route.snapshot.data['sourceType'];
    this.backRoute = this.route.snapshot.data['backRoute'];
  }

  goBack() {
    this.router.navigate([this.backRoute]);
  }
}

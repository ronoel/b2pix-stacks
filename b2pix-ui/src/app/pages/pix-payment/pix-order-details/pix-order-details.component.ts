import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { OrderStatusComponent } from '../../../components/order-status/order-status.component';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';

@Component({
  selector: 'app-pix-order-details',
  standalone: true,
  imports: [OrderStatusComponent, PageHeaderComponent],
  template: `
    <div class="pix-order-details-page">
      <div class="container">
        <app-page-header
          title="Detalhes do pagamento"
          subtitle="Acompanhe o status do seu pagamento PIX"
          backRoute="/pix-payment"
        />

        @if (orderId()) {
          <app-order-status
            [orderId]="orderId()!"
            sourceType="pix_order"
            detailsTitle="Detalhes do pagamento"
            [refreshInterval]="10000"
          />

          <div class="actions">
            <button class="btn btn-outline btn-full" (click)="goBack()">
              Voltar para pagamentos
            </button>
          </div>
        } @else {
          <div class="error-state">
            <h3>ID do pagamento n&atilde;o encontrado</h3>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .pix-order-details-page {
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
export class PixOrderDetailsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  orderId = signal<string | null>(null);

  ngOnInit() {
    this.orderId.set(this.route.snapshot.paramMap.get('id'));
  }

  goBack() {
    this.router.navigate(['/pix-payment']);
  }
}

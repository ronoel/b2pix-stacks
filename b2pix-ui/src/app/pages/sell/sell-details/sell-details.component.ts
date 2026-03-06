import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { OrderStatusComponent } from '../../../components/order-status/order-status.component';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';

@Component({
  selector: 'app-sell-details',
  standalone: true,
  imports: [OrderStatusComponent, PageHeaderComponent],
  template: `
    <div class="sell-details-page">
      <div class="container">
        <app-page-header
          title="Detalhes da venda"
          subtitle="Acompanhe o status da sua venda"
          backRoute="/sell"
        />

        @if (orderId()) {
          <app-order-status
            [orderId]="orderId()!"
            sourceType="sell_order"
            detailsTitle="Detalhes do pedido"
            [refreshInterval]="10000"
          />

          <div class="actions">
            <button class="btn btn-outline btn-full" (click)="goBack()">
              Voltar para vendas
            </button>
          </div>
        } @else {
          <div class="error-state">
            <h3>ID da ordem n&atilde;o encontrado</h3>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .sell-details-page {
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
export class SellDetailsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  orderId = signal<string | null>(null);

  ngOnInit() {
    this.orderId.set(this.route.snapshot.paramMap.get('id'));
  }

  goBack() {
    this.router.navigate(['/sell']);
  }
}

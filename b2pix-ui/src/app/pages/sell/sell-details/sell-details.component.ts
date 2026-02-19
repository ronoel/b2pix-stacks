import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { OrderStatusComponent } from '../../../components/order-status/order-status.component';

@Component({
  selector: 'app-sell-details',
  standalone: true,
  imports: [OrderStatusComponent],
  template: `
    <div class="sell-details-page">
      <div class="container">
        <!-- Header -->
        <div class="page-header">
          <button class="btn btn-ghost" (click)="goBack()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Voltar
          </button>
          <div class="header-content">
            <h1 class="page-title">Detalhes da Venda</h1>
            <p class="page-subtitle">Acompanhe o status da sua ordem de venda</p>
          </div>
        </div>

        @if (orderId()) {
          <app-order-status
            [orderId]="orderId()!"
            sourceType="sell_order"
            detailsTitle="Detalhes da Ordem"
            [refreshInterval]="10000"
          />

          <!-- Actions -->
          <div class="actions">
            <button class="btn btn-outline" (click)="goBack()">
              Voltar para Vendas
            </button>
          </div>
        } @else {
          <div class="error-state">
            <h3>ID da ordem não encontrado</h3>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .sell-details-page {
      min-height: 100vh;
      background: #F8FAFC;
      padding: 24px 0;
    }

    .page-header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #E5E7EB;
    }

    .header-content {
      margin-top: 16px;
    }

    .page-title {
      font-size: 28px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 6px 0;
    }

    .page-subtitle {
      font-size: 15px;
      color: #6B7280;
      margin: 0;
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 64px;
      text-align: center;

      h3 {
        font-size: 20px;
        color: #1F2937;
        margin: 0;
      }
    }

    .actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-top: 24px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-ghost {
      background: transparent;
      color: #6B7280;
      &:hover { color: #1F2937; background: #F3F4F6; }
    }

    .btn-outline {
      background: transparent;
      color: #1E40AF;
      border: 1px solid #1E40AF;
      &:hover { background: #EFF6FF; }
    }

    @media (max-width: 768px) {
      .page-title { font-size: 24px; }
      .actions { flex-direction: column; }
    }

    @media (max-width: 480px) {
      .page-title { font-size: 22px; }
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

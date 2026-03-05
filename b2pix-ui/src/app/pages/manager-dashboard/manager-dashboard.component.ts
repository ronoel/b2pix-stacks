import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BuyOrderService } from '../../shared/api/buy-order.service';
import { PaymentRequestService } from '../../shared/api/payment-request.service';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { ManagerPayoutService } from '../../shared/api/manager-payout.service';
import { PaymentRequestStatus } from '../../shared/models/payment-request.model';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [PageHeaderComponent],
  templateUrl: './manager-dashboard.component.html',
  styleUrl: './manager-dashboard.component.scss'
})
export class ManagerDashboardComponent implements OnInit {
  private router = inject(Router);
  private buyOrderService = inject(BuyOrderService);
  private paymentRequestService = inject(PaymentRequestService);
  private accountValidationService = inject(AccountValidationService);
  private managerPayoutService = inject(ManagerPayoutService);

  analyzingCount = signal(0);
  waitingPaymentsCount = signal(0);
  failedPaymentsCount = signal(0);
  pixVerificationsCount = signal(0);
  disputedCount = signal(0);
  escalatedCount = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);

  totalActionable = computed(() =>
    this.analyzingCount() +
    this.waitingPaymentsCount() +
    this.failedPaymentsCount() +
    this.pixVerificationsCount() +
    this.disputedCount() +
    this.escalatedCount()
  );

  payoutIssuesCount = computed(() =>
    this.disputedCount() + this.escalatedCount()
  );

  ngOnInit() {
    this.loadCounts();
  }

  loadCounts() {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      analyzing: this.buyOrderService.getAnalyzingOrders(),
      waitingPayments: this.paymentRequestService.getPaymentRequests({
        status: [PaymentRequestStatus.Waiting],
        limit: 100
      }),
      failedPayments: this.paymentRequestService.getPaymentRequests({
        status: [PaymentRequestStatus.Failed],
        limit: 100
      }),
      pixVerifications: this.accountValidationService.getProcessingPixVerifications(),
      disputed: this.managerPayoutService.getDisputedRequests(),
      escalated: this.managerPayoutService.getErrorEscalatedRequests()
    }).subscribe({
      next: (results) => {
        this.analyzingCount.set(results.analyzing.length);
        this.waitingPaymentsCount.set(results.waitingPayments.data.length);
        this.failedPaymentsCount.set(results.failedPayments.data.length);
        this.pixVerificationsCount.set(results.pixVerifications.length);
        this.disputedCount.set(results.disputed.length);
        this.escalatedCount.set(results.escalated.length);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading manager dashboard:', err);
        this.error.set('Erro ao carregar dados. Tente novamente.');
        this.loading.set(false);
      }
    });
  }

  navigate(path: string) {
    this.router.navigate([path]);
  }
}

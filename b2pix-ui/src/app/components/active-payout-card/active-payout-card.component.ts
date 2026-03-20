import { Component, inject, input, output, signal, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { PixPayoutRequestService } from '../../shared/api/pix-payout-request.service';
import {
  PixPayoutRequest,
  PayoutRequestStatus,
  isPayoutRequestFinalStatus,
  getPayoutRequestStatusLabel,
  getPayoutRequestStatusClass,
  getSourceTypeLabel
} from '../../shared/models/pix-payout-request.model';
import { formatBrlCents } from '../../shared/utils/format.util';
import { DisputeModalComponent } from '../order-status/components/dispute-modal/dispute-modal.component';

@Component({
  selector: 'app-active-payout-card',
  standalone: true,
  imports: [DisputeModalComponent],
  templateUrl: './active-payout-card.component.html',
  styleUrls: ['./active-payout-card.component.scss']
})
export class ActivePayoutCardComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private payoutRequestService = inject(PixPayoutRequestService);
  private pollSubscription?: Subscription;

  payoutRequest = input.required<PixPayoutRequest>();
  payoutResolved = output<void>();

  // Local copy updated by polling
  currentPayout = signal<PixPayoutRequest | null>(null);

  isConfirming = signal(false);
  confirmError = signal<string | null>(null);
  isDisputing = signal(false);
  disputeError = signal<string | null>(null);
  showDisputeModal = signal(false);

  ngOnInit() {
    this.currentPayout.set(this.payoutRequest());
    this.startPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  private startPolling() {
    this.stopPolling();
    this.pollSubscription = interval(10000).subscribe(() => {
      const pr = this.currentPayout();
      if (!pr) return;

      this.payoutRequestService.getById(pr.id).subscribe({
        next: (updated) => {
          this.currentPayout.set(updated);
          if (isPayoutRequestFinalStatus(updated.status)) {
            this.stopPolling();
            this.payoutResolved.emit();
          }
        },
        error: (err) => {
          console.error('Error polling payout request:', err);
        }
      });
    });
  }

  private stopPolling() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = undefined;
    }
  }

  private payout(): PixPayoutRequest {
    return this.currentPayout() ?? this.payoutRequest();
  }

  get statusLabel(): string {
    return getPayoutRequestStatusLabel(this.payout().status);
  }

  get statusClass(): string {
    return getPayoutRequestStatusClass(this.payout().status);
  }

  get sourceTypeLabel(): string {
    return getSourceTypeLabel(this.payout().source_type);
  }

  get pixValue(): number {
    return this.payout().pix_value;
  }

  get isPaid(): boolean {
    return this.payout().status === PayoutRequestStatus.Paid;
  }

  get isDisputed(): boolean {
    return this.payout().status === PayoutRequestStatus.Disputed;
  }

  get isPendingOrAssigned(): boolean {
    const status = this.payout().status;
    return status === PayoutRequestStatus.Pending || status === PayoutRequestStatus.LpAssigned;
  }

  formatValue(cents: number): string {
    return formatBrlCents(cents);
  }

  onConfirmReceipt(): void {
    this.isConfirming.set(true);
    this.confirmError.set(null);

    this.payoutRequestService.confirmReceipt(this.payout().id).subscribe({
      next: () => {
        this.isConfirming.set(false);
        this.stopPolling();
        this.payoutResolved.emit();
      },
      error: (error) => {
        this.isConfirming.set(false);
        if (error?.message?.includes('cancelada') || error?.message?.includes('canceled')) {
          this.confirmError.set('Assinatura cancelada');
        } else {
          this.confirmError.set(error?.error?.error || 'Erro ao confirmar recebimento');
        }
      }
    });
  }

  onOpenDispute(): void {
    this.showDisputeModal.set(true);
    this.disputeError.set(null);
  }

  onCloseDispute(): void {
    this.showDisputeModal.set(false);
  }

  onDisputeSubmitted(): void {
    this.isDisputing.set(true);
    this.disputeError.set(null);

    this.payoutRequestService.disputeRequest(this.payout().id).subscribe({
      next: () => {
        this.isDisputing.set(false);
        this.showDisputeModal.set(false);
        this.payoutResolved.emit();
      },
      error: (error) => {
        this.isDisputing.set(false);
        if (error?.message?.includes('cancelada') || error?.message?.includes('canceled')) {
          this.disputeError.set('Assinatura cancelada');
        } else {
          this.disputeError.set(error?.error?.error || 'Erro ao abrir disputa');
        }
      }
    });
  }

  viewDetails(): void {
    const pr = this.payout();
    if (pr.source_type === 'sell_order') {
      this.router.navigate(['/sell', pr.source_id]);
    } else {
      this.router.navigate(['/pix-payment', pr.source_id]);
    }
  }
}

import { Component, input, output, signal, OnInit, OnDestroy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { PixCopiaColaComponent } from '../../../components/pix-copia-cola/pix-copia-cola.component';
import { ConfirmActionSheetComponent } from '../../../components/confirm-action-sheet/confirm-action-sheet.component';
import { PixPayoutRequest, getSourceTypeLabel } from '../../../shared/models/pix-payout-request.model';
import { formatBrlCents } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-lp-active-order',
  standalone: true,
  imports: [FormsModule, PixCopiaColaComponent, ConfirmActionSheetComponent],
  templateUrl: './lp-active-order.component.html',
  styleUrl: './lp-active-order.component.scss'
})
export class LpActiveOrderComponent implements OnInit, OnDestroy {
  order = input.required<PixPayoutRequest>();
  isProcessing = input<boolean>(false);
  processingAction = input<string>('');

  paid = output<void>();
  cancelled = output<void>();
  reported = output<string>();   // emits reason

  reportReason = '';
  showReportSheet = signal(false);
  showConfirmPay = signal(false);
  showConfirmCancel = signal(false);

  remainingSeconds = signal(0);
  private timerInterval?: ReturnType<typeof setInterval>;
  private readonly LP_TIMEOUT_MINUTES = 15;

  ngOnInit() {
    this.updateTimer();
    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private updateTimer() {
    const acceptedAt = this.order().lp_accepted_at;
    if (!acceptedAt) {
      this.remainingSeconds.set(0);
      return;
    }

    const deadline = new Date(acceptedAt).getTime() + (this.LP_TIMEOUT_MINUTES * 60 * 1000);
    const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
    this.remainingSeconds.set(remaining);
  }

  remainingMinutes(): number {
    return Math.floor(this.remainingSeconds() / 60);
  }

  progressPercent(): number {
    const totalSeconds = this.LP_TIMEOUT_MINUTES * 60;
    return Math.max(0, (this.remainingSeconds() / totalSeconds) * 100);
  }

  formatCountdown(): string {
    const total = this.remainingSeconds();
    if (total <= 0) return '00:00';
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  formatBrlCents = formatBrlCents;

  getSourceLabel(sourceType: string): string {
    return getSourceTypeLabel(sourceType as any);
  }

  onConfirmPayment() {
    this.paid.emit();
  }

  onCancel() {
    this.cancelled.emit();
  }

  onReport() {
    const reason = this.reportReason.trim();
    if (reason) {
      this.showReportSheet.set(false);
      this.reported.emit(reason);
    }
  }
}

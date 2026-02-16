import { Component, input, output, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PixPayoutRequest, getSourceTypeLabel } from '../../../shared/models/pix-payout-request.model';

@Component({
  selector: 'app-lp-active-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lp-active-order.component.html',
  styleUrl: './lp-active-order.component.scss'
})
export class LpActiveOrderComponent implements OnInit, OnDestroy {
  order = input.required<PixPayoutRequest>();
  isProcessing = input<boolean>(false);
  processingAction = input<string>('');

  paid = output<string>();       // emits pixEndToEndId
  cancelled = output<void>();
  reported = output<string>();   // emits reason

  pixIdValue = '';
  reportReason = '';
  showReportModal = signal(false);
  payloadCopied = signal(false);

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

  formatBrlCents(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100);
  }

  getSourceLabel(sourceType: string): string {
    return getSourceTypeLabel(sourceType as any);
  }

  copyPayload() {
    const payload = this.order().qr_code_payload;
    if (payload) {
      navigator.clipboard.writeText(payload).then(() => {
        this.payloadCopied.set(true);
        setTimeout(() => this.payloadCopied.set(false), 2000);
      });
    }
  }

  copyPixKey() {
    const pixKey = this.order().pix_key;
    if (pixKey) {
      navigator.clipboard.writeText(pixKey).then(() => {
        this.payloadCopied.set(true);
        setTimeout(() => this.payloadCopied.set(false), 2000);
      });
    }
  }

  onConfirmPayment() {
    const pixId = this.pixIdValue.trim();
    if (pixId) {
      this.paid.emit(pixId);
    }
  }

  onCancel() {
    this.cancelled.emit();
  }

  onReport() {
    const reason = this.reportReason.trim();
    if (reason) {
      this.showReportModal.set(false);
      this.reported.emit(reason);
    }
  }
}

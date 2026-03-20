import { Component, input, output, signal } from '@angular/core';
import { PixPayoutRequest, PayoutRequestStatus, getSourceTypeLabel, getPayoutRequestStatusLabel, getPayoutRequestStatusClass } from '../../../shared/models/pix-payout-request.model';
import { MessageChatComponent } from '../../../components/order-status/components/message-chat/message-chat.component';
import { ConfirmActionSheetComponent } from '../../../components/confirm-action-sheet/confirm-action-sheet.component';
import { formatBrlCents, formatTruncated, formatDateTime } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-payout-dispute-card',
  standalone: true,
  imports: [MessageChatComponent, ConfirmActionSheetComponent],
  templateUrl: './payout-dispute-card.component.html',
  styleUrl: './payout-dispute-card.component.scss'
})
export class PayoutDisputeCardComponent {
  item = input.required<PixPayoutRequest>();
  mode = input.required<'disputed' | 'escalated'>();
  isProcessing = input<boolean>(false);

  showChat = signal(false);
  showConfirmLp = signal(false);
  showConfirmCustomer = signal(false);
  showConfirmEscalation = signal(false);

  disputeResolved = output<{ id: string; ruling: 'lp' | 'customer' }>();
  resolveEscalation = output<string>();

  toggleChat() {
    this.showChat.update(v => !v);
  }

  formatBrlCents = formatBrlCents;
  formatTruncated = formatTruncated;
  formatDateTime = formatDateTime;

  getSourceLabel(sourceType: string): string {
    return getSourceTypeLabel(sourceType as any);
  }

  getStatusLabel(status: PayoutRequestStatus): string {
    return getPayoutRequestStatusLabel(status);
  }

  getStatusClass(status: PayoutRequestStatus): string {
    return getPayoutRequestStatusClass(status);
  }
}

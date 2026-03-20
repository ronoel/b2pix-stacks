import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { AccountPixVerify } from '../../../shared/models/account-validation.model';
import { ConfirmActionSheetComponent } from '../../../components/confirm-action-sheet/confirm-action-sheet.component';

@Component({
  selector: 'app-pix-moderation-card',
  standalone: true,
  imports: [ConfirmActionSheetComponent],
  templateUrl: './pix-moderation-card.component.html',
  styleUrl: './pix-moderation-card.component.scss'
})
export class PixModerationCardComponent {
  @Input() verification!: AccountPixVerify;
  @Input() isProcessing = false;

  @Output() approve = new EventEmitter<string>();
  @Output() reject = new EventEmitter<string>();

  showConfirmApprove = signal(false);
  showConfirmReject = signal(false);

  onApprove() {
    this.approve.emit(this.verification.address);
  }

  onReject() {
    this.reject.emit(this.verification.address);
  }

  formatAddress(address: string): string {
    if (address.length <= 16) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

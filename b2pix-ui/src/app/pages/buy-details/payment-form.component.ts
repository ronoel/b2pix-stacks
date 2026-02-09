import { Component, Input, Output, EventEmitter, ViewEncapsulation, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PixCopiaColaComponent } from '../../components/pix-copia-cola/pix-copia-cola.component';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, FormsModule, PixCopiaColaComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './payment-form.component.html',
  styleUrl: './payment-form.component.scss'
})
export class PaymentFormComponent {
  @Input() formattedTime = '00:00';
  @Input() fiatAmount = '';
  @Input() btcAmount = '';
  @Input() pixKey = '';
  @Input() canConfirm = false;
  @Input() fiatAmountValue = 0;
  @Input() sellerName = 'VENDEDOR';
  @Input() sellerCity = 'BRASILIA';

  @Output() copyPix = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() transactionIdChanged = new EventEmitter<string>();
  @Output() noTransactionIdChanged = new EventEmitter<boolean>();

  transactionId = signal('');
  noTransactionId = signal(false);

  onTransactionIdChange(value: string) {
    this.transactionId.set(value.toUpperCase());
    this.transactionIdChanged.emit(value.toUpperCase());
    if (value.length > 0) {
      this.noTransactionId.set(false);
      this.noTransactionIdChanged.emit(false);
    }
  }

  onNoTransactionIdChange(checked: boolean) {
    this.noTransactionId.set(checked);
    this.noTransactionIdChanged.emit(checked);
    if (checked) {
      this.transactionId.set('');
      this.transactionIdChanged.emit('');
    }
  }
}

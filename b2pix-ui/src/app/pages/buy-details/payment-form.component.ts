import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';

import { PixCopiaColaComponent } from '../../components/pix-copia-cola/pix-copia-cola.component';
import { ConfirmationCodeInputComponent } from '../../components/confirmation-code-input/confirmation-code-input.component';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [PixCopiaColaComponent, ConfirmationCodeInputComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './payment-form.component.html',
  styleUrl: './payment-form.component.scss'
})
export class PaymentFormComponent {
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
}

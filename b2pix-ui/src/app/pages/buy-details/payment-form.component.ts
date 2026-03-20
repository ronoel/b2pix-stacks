import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';

import { PixCopiaColaComponent } from '../../components/pix-copia-cola/pix-copia-cola.component';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [PixCopiaColaComponent],
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
  @Input() showPaymentInfo = true;
  @Input() confirmLabel = 'Confirmar pagamento';

  @Output() copyPix = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}

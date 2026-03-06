import { Component, Input, Output, EventEmitter, ViewEncapsulation, signal, ElementRef, viewChildren } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { PixCopiaColaComponent } from '../../components/pix-copia-cola/pix-copia-cola.component';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [FormsModule, PixCopiaColaComponent],
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

  // 3 individual character signals
  char0 = signal('');
  char1 = signal('');
  char2 = signal('');

  noTransactionId = signal(false);

  // Compute full transaction ID from 3 chars
  get transactionId(): string {
    return (this.char0() + this.char1() + this.char2()).toUpperCase();
  }

  onCharInput(index: 0 | 1 | 2, event: Event, nextInput?: HTMLInputElement | null) {
    const target = event.target as HTMLInputElement;
    const val = target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-1);
    target.value = val;

    if (index === 0) this.char0.set(val);
    if (index === 1) this.char1.set(val);
    if (index === 2) this.char2.set(val);

    const full = (this.char0() + this.char1() + this.char2()).toUpperCase();
    this.transactionIdChanged.emit(full);

    if (val && nextInput) {
      nextInput.focus();
    }
  }

  onCharKeydown(index: 0 | 1 | 2, event: KeyboardEvent, prevInput?: HTMLInputElement | null) {
    if (event.key === 'Backspace') {
      const target = event.target as HTMLInputElement;
      if (!target.value && prevInput) {
        prevInput.focus();
      }
    }
  }

  onNoTransactionIdChange(checked: boolean) {
    this.noTransactionId.set(checked);
    this.noTransactionIdChanged.emit(checked);
    if (checked) {
      this.char0.set('');
      this.char1.set('');
      this.char2.set('');
      this.transactionIdChanged.emit('');
    }
  }
}

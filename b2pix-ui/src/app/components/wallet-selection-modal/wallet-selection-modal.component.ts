import { Component, Output, EventEmitter, ViewEncapsulation } from '@angular/core';


export type WalletSelectionType = 'create' | 'import' | 'external';

@Component({
  selector: 'app-wallet-selection-modal',
  standalone: true,
  imports: [],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './wallet-selection-modal.component.html',
  styleUrl: './wallet-selection-modal.component.scss'
})
export class WalletSelectionModalComponent {
  @Output() walletSelected = new EventEmitter<WalletSelectionType>();
  @Output() cancelled = new EventEmitter<void>();

  onSelect(type: WalletSelectionType) {
    this.walletSelected.emit(type);
  }

  onCancel() {
    this.cancelled.emit();
  }
}

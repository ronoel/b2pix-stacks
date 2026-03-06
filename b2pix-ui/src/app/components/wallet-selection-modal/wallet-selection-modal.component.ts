import { Component, output } from '@angular/core';

export type WalletSelectionType = 'create' | 'import' | 'external';

@Component({
  selector: 'app-wallet-selection-modal',
  standalone: true,
  imports: [],
  templateUrl: './wallet-selection-modal.component.html',
  styleUrl: './wallet-selection-modal.component.scss'
})
export class WalletSelectionModalComponent {
  readonly walletSelected = output<WalletSelectionType>();
  readonly cancelled = output<void>();

  onSelect(type: WalletSelectionType) {
    this.walletSelected.emit(type);
  }

  onCancel() {
    this.cancelled.emit();
  }
}

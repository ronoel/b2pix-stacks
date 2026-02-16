import { Component, output } from '@angular/core';


export type WalletRecommendation = 'external' | 'embedded' | 'import';

@Component({
  selector: 'app-wallet-recommendation',
  imports: [],
  standalone: true,
  templateUrl: './wallet-recommendation.component.html',
  styleUrl: './wallet-recommendation.component.scss'
})
export class WalletRecommendationComponent {
  readonly walletSelected = output<WalletRecommendation>();

  onSelectWallet(type: WalletRecommendation) {
    this.walletSelected.emit(type);
  }
}

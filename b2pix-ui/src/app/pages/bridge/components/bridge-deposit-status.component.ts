import { Component, input, output, signal, computed } from '@angular/core';
import { BridgeOperationStatus } from '../bridge.types';

@Component({
  selector: 'app-bridge-deposit-status',
  standalone: true,
  templateUrl: './bridge-deposit-status.component.html',
  styleUrl: './bridge-deposit-status.component.scss',
})
export class BridgeDepositStatusComponent {
  btcTxid = input.required<string>();
  status = input<BridgeOperationStatus>('broadcasted');
  emilyStatus = input<string>('');

  newDeposit = output<void>();
  goToDashboard = output<void>();

  txidCopied = signal(false);

  readonly explorerUrl = computed(() => `https://mempool.space/tx/${this.btcTxid()}`);

  readonly timelineSteps = computed(() => {
    const s = this.status();
    return [
      { label: 'Transação Bitcoin enviada', done: true, active: false },
      { label: 'Signers notificados', done: true, active: false },
      { label: 'Aguardando confirmações (~60 min)', done: s === 'confirmed', active: s === 'broadcasted' },
      { label: 'sBTC creditado', done: s === 'confirmed', active: false },
    ];
  });

  copyTxid(): void {
    navigator.clipboard.writeText(this.btcTxid()).then(() => {
      this.txidCopied.set(true);
      setTimeout(() => this.txidCopied.set(false), 2000);
    });
  }
}

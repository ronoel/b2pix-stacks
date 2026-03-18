import { Component, input, output, signal, computed } from '@angular/core';
import { BridgeOperationStatus, getStatusLabel, getStatusClass } from '../bridge.types';

@Component({
  selector: 'app-bridge-withdraw-status',
  standalone: true,
  templateUrl: './bridge-withdraw-status.component.html',
  styleUrl: './bridge-withdraw-status.component.scss',
})
export class BridgeWithdrawStatusComponent {
  stacksTxid = input.required<string>();
  btcAddress = input<string>('');
  amount = input<number>(0);
  status = input<BridgeOperationStatus>('pending');
  btcTxidFulfillment = input<string>('');

  newWithdraw = output<void>();
  goToDashboard = output<void>();

  stacksTxidCopied = signal(false);
  btcTxidCopied = signal(false);

  readonly statusLabel = computed(() => getStatusLabel(this.status()));
  readonly statusClass = computed(() => getStatusClass(this.status()));

  readonly stacksExplorerUrl = computed(() => `https://explorer.hiro.so/txid/${this.stacksTxid()}`);
  readonly btcExplorerUrl = computed(() => this.btcTxidFulfillment() ? `https://mempool.space/tx/${this.btcTxidFulfillment()}` : '');

  readonly timelineSteps = computed(() => {
    const s = this.status();
    return [
      { label: 'Pendente', done: s !== 'pending', active: s === 'pending' },
      { label: 'Aceito pelos signers', done: s === 'confirmed', active: s === 'broadcasted' },
      { label: 'BTC enviado', done: s === 'confirmed', active: false },
    ];
  });

  copyStacksTxid(): void {
    navigator.clipboard.writeText(this.stacksTxid()).then(() => {
      this.stacksTxidCopied.set(true);
      setTimeout(() => this.stacksTxidCopied.set(false), 2000);
    });
  }

  copyBtcTxid(): void {
    const txid = this.btcTxidFulfillment();
    if (!txid) return;
    navigator.clipboard.writeText(txid).then(() => {
      this.btcTxidCopied.set(true);
      setTimeout(() => this.btcTxidCopied.set(false), 2000);
    });
  }

  formatSats(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }
}

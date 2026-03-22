import { Component, input, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BridgeService } from '../bridge.service';
import { BridgeOperationType, getStatusLabel, getStatusClass, getTypeLabel } from '../bridge.types';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-bridge-history',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './bridge-history.component.html',
  styleUrl: './bridge-history.component.scss',
})
export class BridgeHistoryComponent {
  private bridgeService = inject(BridgeService);

  filterType = input.required<BridgeOperationType>();
  expandedId = signal<string | null>(null);

  readonly filteredOps = computed(() =>
    this.bridgeService.operations().filter(o => o.type === this.filterType())
  );

  getStatusLabel = getStatusLabel;
  getStatusClass = getStatusClass;
  getTypeLabel = getTypeLabel;

  formatSats(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }

  toggleExpand(id: string): void {
    this.expandedId.update(current => current === id ? null : id);
  }

  truncateTxid(txid: string): string {
    if (txid.length <= 16) return txid;
    return `${txid.slice(0, 8)}…${txid.slice(-8)}`;
  }

  getMempoolUrl(txid: string): string {
    const base = environment.network === 'mainnet'
      ? 'https://mempool.space'
      : 'https://mempool.space/testnet';
    return `${base}/tx/${txid}`;
  }

  getStacksExplorerUrl(txid: string): string {
    const suffix = environment.network === 'mainnet' ? '' : '?chain=testnet';
    return `https://explorer.hiro.so/txid/${txid}${suffix}`;
  }

  refresh(): void {
    this.bridgeService.refreshOperations();
  }
}

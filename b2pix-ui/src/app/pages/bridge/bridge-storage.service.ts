import { Injectable, inject } from '@angular/core';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { BridgeOperationRecord, BridgeStorageData, isFinalStatus } from './bridge.types';

@Injectable({ providedIn: 'root' })
export class BridgeStorageService {
  private walletManager = inject(WalletManagerService);

  private readonly STORAGE_PREFIX = 'b2pix_bridge_';
  private readonly MAX_RECORDS = 50;

  private getKey(): string | null {
    const addr = this.walletManager.getSTXAddress();
    return addr ? `${this.STORAGE_PREFIX}${addr}` : null;
  }

  loadOperations(): BridgeOperationRecord[] {
    const key = this.getKey();
    if (!key) return [];

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const data: BridgeStorageData = JSON.parse(raw);
      return data.operations ?? [];
    } catch {
      return [];
    }
  }

  saveOperation(record: BridgeOperationRecord): void {
    const key = this.getKey();
    if (!key) return;

    const ops = this.loadOperations();
    const idx = ops.findIndex(o => o.id === record.id);

    if (idx >= 0) {
      ops[idx] = { ...ops[idx], ...record, updatedAt: new Date().toISOString() };
    } else {
      ops.unshift(record);
    }

    // Prune to max records
    const pruned = ops.slice(0, this.MAX_RECORDS);
    const data: BridgeStorageData = { operations: pruned };
    localStorage.setItem(key, JSON.stringify(data));
  }

  updateOperation(id: string, updates: Partial<BridgeOperationRecord>): void {
    const key = this.getKey();
    if (!key) return;

    const ops = this.loadOperations();
    const idx = ops.findIndex(o => o.id === id);
    if (idx < 0) return;

    ops[idx] = { ...ops[idx], ...updates, updatedAt: new Date().toISOString() };
    const data: BridgeStorageData = { operations: ops };
    localStorage.setItem(key, JSON.stringify(data));
  }

  getProcessingOperations(): BridgeOperationRecord[] {
    return this.loadOperations().filter(o => !isFinalStatus(o.status));
  }
}

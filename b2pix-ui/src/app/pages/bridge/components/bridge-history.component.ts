import { Component, input, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BridgeService } from '../bridge.service';
import { BridgeOperationType, getStatusLabel, getStatusClass, getTypeLabel } from '../bridge.types';

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

  readonly filteredOps = computed(() =>
    this.bridgeService.operations().filter(o => o.type === this.filterType())
  );

  getStatusLabel = getStatusLabel;
  getStatusClass = getStatusClass;
  getTypeLabel = getTypeLabel;

  formatSats(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }

  refresh(): void {
    this.bridgeService.refreshOperations();
  }
}

import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DepositConfig } from '../bridge.types';

@Component({
  selector: 'app-bridge-deposit-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './bridge-deposit-form.component.html',
  styleUrl: './bridge-deposit-form.component.scss',
})
export class BridgeDepositFormComponent {
  generateAddress = output<DepositConfig>();

  maxSignerFee = 4_000;
  reclaimLockTime = 700;
  showAdvanced = signal(false);

  formatSats(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }

  submit(): void {
    this.generateAddress.emit({
      amount: 0,
      maxSignerFee: this.maxSignerFee,
      reclaimLockTime: this.reclaimLockTime,
    });
  }
}

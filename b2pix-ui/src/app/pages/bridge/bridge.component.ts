import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { BridgeStepIndicatorComponent } from './components/bridge-step-indicator.component';
import { BridgeDepositAddressComponent } from './components/bridge-deposit-address.component';
import { BridgeWithdrawFormComponent } from './components/bridge-withdraw-form.component';
import { BridgeWithdrawStatusComponent } from './components/bridge-withdraw-status.component';
import { BridgeHistoryComponent } from './components/bridge-history.component';
import { BridgeService } from './bridge.service';
import {
  BridgeDirection,
  WithdrawStep,
  WithdrawConfig,
  DecodedBtcAddress,
  BridgeOperationStatus,
} from './bridge.types';

@Component({
  selector: 'app-bridge',
  standalone: true,
  imports: [
    PageHeaderComponent,
    BridgeStepIndicatorComponent,
    BridgeDepositAddressComponent,
    BridgeWithdrawFormComponent,
    BridgeWithdrawStatusComponent,
    BridgeHistoryComponent,
  ],
  templateUrl: './bridge.component.html',
  styleUrl: './bridge.component.scss',
})
export class BridgeComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  readonly bridgeService = inject(BridgeService);

  activeTab = signal<BridgeDirection>('deposit');

  // Deposit state — persistent address, auto-generated
  depositAddress = signal('');
  depositMaxFee = signal(10_000); // safe cap — actual signer fee is much lower
  depositLoading = signal(false);
  depositError = signal('');

  // Withdrawal state
  withdrawStep = signal<WithdrawStep>('form');
  withdrawStacksTxid = signal('');
  withdrawBtcAddress = signal('');
  withdrawAmount = signal(100_000);
  withdrawStatus = signal<BridgeOperationStatus>('pending');
  withdrawBtcTxidFulfillment = signal('');

  // Loading / error
  isLoading = signal(false);
  errorMessage = signal('');

  readonly withdrawStepLabels = ['Formulário', 'Status'];

  get withdrawStepIndex(): number {
    const map: Record<WithdrawStep, number> = { form: 0, processing: 1 };
    return map[this.withdrawStep()];
  }

  ngOnInit(): void {
    this.bridgeService.initialize();
    this.loadDepositAddress();
  }

  ngOnDestroy(): void {
    this.bridgeService.stopAllPolling();
  }

  // ===== Deposit =====

  async loadDepositAddress(): Promise<void> {
    // Already loaded
    if (this.depositAddress()) return;

    try {
      this.depositLoading.set(true);
      this.depositError.set('');

      const result = await this.bridgeService.generateDepositAddress({
        amount: 0,
        maxSignerFee: this.depositMaxFee(),
        reclaimLockTime: 700,
      });

      this.depositAddress.set(result.address);
    } catch (err) {
      this.depositError.set((err as Error).message);
    } finally {
      this.depositLoading.set(false);
    }
  }

  // ===== Withdrawal handlers =====

  async onInitiateWithdraw(params: WithdrawConfig & { decoded: DecodedBtcAddress }): Promise<void> {
    try {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const result = await this.bridgeService.initiateWithdrawal(params);

      this.withdrawStacksTxid.set(result.stacksTxid);
      this.withdrawBtcAddress.set(params.btcAddress);
      this.withdrawAmount.set(params.amount);
      this.withdrawStatus.set('pending');
      this.withdrawStep.set('processing');
    } catch (err) {
      this.errorMessage.set((err as Error).message);
    } finally {
      this.isLoading.set(false);
    }
  }

  onNewWithdraw(): void {
    this.withdrawStep.set('form');
    this.withdrawStacksTxid.set('');
    this.withdrawBtcTxidFulfillment.set('');
    this.errorMessage.set('');
  }

  // ===== Navigation =====

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}

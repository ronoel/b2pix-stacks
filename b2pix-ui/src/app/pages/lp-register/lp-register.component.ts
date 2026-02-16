import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BankSetupComponent } from '../../components/bank-setup/bank-setup.component';
import { AccountValidationService } from '../../shared/api/account-validation.service';

@Component({
  selector: 'app-lp-register',
  standalone: true,
  imports: [CommonModule, BankSetupComponent],
  templateUrl: './lp-register.component.html',
  styleUrls: ['./lp-register.component.scss']
})
export class LpRegisterComponent {
  private router = inject(Router);
  private accountValidationService = inject(AccountValidationService);

  showBankSetup = signal(false);
  setupCompleted = signal(false);

  startSetup() {
    this.showBankSetup.set(true);
  }

  onSetupSuccess() {
    this.showBankSetup.set(false);
    this.setupCompleted.set(true);
    // Clear cached account info so dashboard re-fetches is_lp
    this.accountValidationService.clearAccountCache();
  }

  onSetupComplete() {
    this.router.navigate(['/dashboard']);
  }

  onSetupCancelled() {
    this.showBankSetup.set(false);
  }

  goBack() {
    if (this.showBankSetup()) {
      this.showBankSetup.set(false);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}

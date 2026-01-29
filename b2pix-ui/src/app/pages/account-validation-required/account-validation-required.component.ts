import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { AccountInfo } from '../../shared/models/account-validation.model';

@Component({
  selector: 'app-account-validation-required',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account-validation-required.component.html',
  styleUrl: './account-validation-required.component.scss'
})
export class AccountValidationRequiredComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private accountValidationService = inject(AccountValidationService);

  accountInfo = signal<AccountInfo | null>(null);
  isLoading = signal(true);
  returnUrl = signal<string>('/dashboard');

  ngOnInit() {
    // Get return URL from query params
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl']) {
        this.returnUrl.set(params['returnUrl']);
      }
    });

    this.loadAccountInfo();
  }

  private loadAccountInfo() {
    this.accountValidationService.getAccount().subscribe({
      next: (account) => {
        this.accountInfo.set(account);
        this.isLoading.set(false);

        // If already validated, redirect to return URL
        if (account.email_verified && account.pix_verified) {
          this.router.navigate([this.returnUrl()]);
        }
      },
      error: (error) => {
        console.error('Error loading account:', error);
        this.isLoading.set(false);
      }
    });
  }

  getValidationMessage(): string {
    const account = this.accountInfo();
    if (!account) {
      return 'Para acessar esta área, você precisa validar seu email e sua conta bancária.';
    }

    if (!account.email_verified) {
      return 'Para acessar esta área, você precisa validar seu email primeiro.';
    }

    if (!account.pix_verified) {
      return 'Para acessar esta área, você precisa validar sua conta bancária (chave PIX).';
    }

    return 'Sua conta está totalmente validada.';
  }

  getNextStep(): string {
    const account = this.accountInfo();
    if (!account || !account.email_verified) {
      return 'email';
    }
    return 'pix';
  }

  getStepLabel(): string {
    return this.getNextStep() === 'email' ? 'Validar Email' : 'Validar Conta Bancária';
  }

  startValidation() {
    const returnUrl = this.returnUrl();
    if (this.getNextStep() === 'email') {
      this.router.navigate(['/email-validation'], {
        queryParams: { returnUrl }
      });
    } else {
      this.router.navigate(['/pix-validation'], {
        queryParams: { returnUrl }
      });
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}

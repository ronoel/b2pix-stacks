import { Component, inject, OnInit, signal } from '@angular/core';

import { Router, ActivatedRoute } from '@angular/router';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { AccountInfo } from '../../shared/models/account-validation.model';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';

@Component({
  selector: 'app-account-validation-required',
  standalone: true,
  imports: [PageHeaderComponent],
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

  // Failure state — set when returning from /pix-validation with status=failed
  pixFailed = signal(false);
  pixFailedMessage = signal('');

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl']) {
        this.returnUrl.set(params['returnUrl']);
      }
      if (params['pixFailed'] === 'true') {
        this.pixFailed.set(true);
        this.pixFailedMessage.set(
          params['message'] || 'Código de confirmação incorreto ou depósito não encontrado.'
        );
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

  getStepText(): string {
    const account = this.accountInfo();
    if (!account || !account.email_verified) return 'Passo 1 de 2';
    return 'Passo 2 de 2';
  }

  getNextStep(): 'email' | 'pix' {
    const account = this.accountInfo();
    if (!account || !account.email_verified) return 'email';
    return 'pix';
  }

  startValidation() {
    const returnUrl = this.returnUrl();
    if (this.getNextStep() === 'email') {
      this.router.navigate(['/email-validation'], { queryParams: { returnUrl } });
    } else {
      this.router.navigate(['/pix-validation'], { queryParams: { returnUrl } });
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}

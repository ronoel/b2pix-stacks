import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { AccountPixVerify, PixResolution } from '../../shared/models/account-validation.model';
import { PixModerationCardComponent } from './components/pix-moderation-card.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';

@Component({
  selector: 'app-pix-moderation',
  standalone: true,
  imports: [PixModerationCardComponent, PageHeaderComponent],
  templateUrl: './pix-moderation.component.html',
  styleUrl: './pix-moderation.component.scss'
})
export class PixModerationComponent implements OnInit {
  private router = inject(Router);
  private accountValidationService = inject(AccountValidationService);

  // Signals
  processingVerifications = signal<AccountPixVerify[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  processingAddress = signal<string | null>(null);

  // Toast
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');

  ngOnInit() {
    this.loadProcessingVerifications();
  }

  goBack() {
    this.router.navigate(['/manager-dashboard']);
  }

  loadProcessingVerifications() {
    this.loading.set(true);
    this.error.set(null);

    this.accountValidationService.getProcessingPixVerifications().subscribe({
      next: (verifications) => {
        this.processingVerifications.set(verifications);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading processing verifications:', error);
        this.error.set('Erro ao carregar verificações pendentes. Tente novamente.');
        this.loading.set(false);
      }
    });
  }

  onApprove(address: string) {
    this.resolveVerification(address, 'verified');
  }

  onReject(address: string) {
    this.resolveVerification(address, 'failed');
  }

  private resolveVerification(address: string, resolution: PixResolution) {
    this.processingAddress.set(address);

    this.accountValidationService.resolvePixVerification(address, resolution).subscribe({
      next: () => {
        // Remove from list
        const current = this.processingVerifications();
        this.processingVerifications.set(current.filter(v => v.address !== address));
        this.processingAddress.set(null);

        // Show success toast
        const message = resolution === 'verified'
          ? 'Verificação aprovada com sucesso!'
          : 'Verificação rejeitada com sucesso!';
        this.showToast(message, 'success');
      },
      error: (error) => {
        console.error('Error resolving verification:', error);
        this.processingAddress.set(null);
        this.showToast(error.message || 'Erro ao processar verificação', 'error');
      }
    });
  }

  private showToast(message: string, type: 'success' | 'error') {
    this.toastMessage.set(message);
    this.toastType.set(type);

    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }
}

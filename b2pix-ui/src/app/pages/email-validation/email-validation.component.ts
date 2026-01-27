import { Component, OnInit, OnDestroy, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { EmailVerificationStep } from '../../shared/models/account-validation.model';
import { CountdownTimerComponent } from './components/countdown-timer.component';
import { CodeInputComponent } from './components/code-input.component';

@Component({
  selector: 'app-email-validation',
  standalone: true,
  imports: [CommonModule, FormsModule, CountdownTimerComponent, CodeInputComponent],
  templateUrl: './email-validation.component.html',
  styleUrl: './email-validation.component.scss'
})
export class EmailValidationComponent implements OnInit, OnDestroy {
  @ViewChild(CodeInputComponent) codeInput?: CodeInputComponent;

  private validationService = inject(AccountValidationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // State
  email = signal('');
  code = signal('');
  step = signal<EmailVerificationStep>('enter-email');
  loading = signal(false);
  error = signal('');

  // Countdown
  resendCountdown = signal(0);
  private resendTimer: any;

  // Return URL
  private returnUrl = '/pix-validation';

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/pix-validation';

    // Verificar se já está validado
    this.validationService.getEmailVerification().subscribe({
      next: (verification) => {
        if (verification.status === 'verified') {
          // Já verificado, redirecionar
          this.router.navigateByUrl(this.returnUrl);
        } else if ((verification.status === 'awaiting' || verification.status === 'processing') && verification.email) {
          // Já tem código enviado e aguardando entrada do usuário
          this.email.set(verification.email);
          this.step.set('enter-code');
          this.calculateResendTime(verification.created_at);
        }
      }
    });
  }

  sendCode(): void {
    if (!this.isValidEmail(this.email())) {
      this.error.set('Email inválido');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.validationService.sendEmailCode(this.email()).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('enter-code');
        this.startResendCountdown(180); // 3 minutos
      },
      error: (err) => {
        this.loading.set(false);
        this.handleError(err);
      }
    });
  }

  verifyCode(): void {
    const codeValue = this.code();

    if (codeValue.length !== 6) {
      this.error.set('Código deve ter 6 dígitos');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.validationService.verifyEmailCode(codeValue).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('success');

        // Refresh account data before redirecting
        this.validationService.getAccount().subscribe({
          next: () => {
            // Account data refreshed, now redirect after 1.5 segundos
            setTimeout(() => {
              this.router.navigateByUrl(this.returnUrl);
            }, 1500);
          },
          error: () => {
            // Even if refresh fails, still redirect
            setTimeout(() => {
              this.router.navigateByUrl(this.returnUrl);
            }, 1500);
          }
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message || 'Código inválido');

        // Limpar código para tentar novamente
        this.code.set('');
        this.codeInput?.clear();
      }
    });
  }

  resend(): void {
    if (this.resendCountdown() > 0) return;

    this.code.set('');
    this.error.set('');
    this.codeInput?.clear();
    this.sendCode();
  }

  onCodeComplete(code: string): void {
    this.code.set(code);
    // Auto-verificar quando completar os 6 dígitos
    setTimeout(() => this.verifyCode(), 100);
  }

  onCodeChange(code: string): void {
    this.code.set(code);
    this.error.set(''); // Limpar erro ao digitar
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private startResendCountdown(seconds: number): void {
    this.resendCountdown.set(seconds);

    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }

    this.resendTimer = setInterval(() => {
      const current = this.resendCountdown();
      if (current <= 0) {
        clearInterval(this.resendTimer);
      } else {
        this.resendCountdown.set(current - 1);
      }
    }, 1000);
  }

  private calculateResendTime(createdAt?: string): void {
    if (!createdAt) return;

    const created = new Date(createdAt);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - created.getTime()) / 1000);
    const remaining = Math.max(0, 180 - elapsed); // 3 minutos

    if (remaining > 0) {
      this.startResendCountdown(remaining);
    }
  }

  private handleError(error: any): void {
    if (error.message) {
      this.error.set(error.message);
    } else if (error.status === 429) {
      this.error.set('Muitas tentativas. Aguarde antes de tentar novamente.');
    } else {
      this.error.set('Erro ao enviar código. Tente novamente.');
    }
  }

  ngOnDestroy(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }
}

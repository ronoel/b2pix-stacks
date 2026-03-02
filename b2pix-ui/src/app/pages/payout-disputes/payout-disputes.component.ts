import { Component, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ManagerPayoutService } from '../../shared/api/manager-payout.service';
import { PixPayoutRequest } from '../../shared/models/pix-payout-request.model';
import { PayoutDisputeCardComponent } from './components/payout-dispute-card.component';

@Component({
  selector: 'app-payout-disputes',
  standalone: true,
  imports: [PayoutDisputeCardComponent],
  templateUrl: './payout-disputes.component.html',
  styleUrl: './payout-disputes.component.scss'
})
export class PayoutDisputesComponent implements OnInit {
  private router = inject(Router);
  private managerPayoutService = inject(ManagerPayoutService);

  selectedTab = signal<'disputed' | 'escalated'>('disputed');

  disputedItems = signal<PixPayoutRequest[]>([]);
  isLoadingDisputed = signal(false);
  errorDisputed = signal<string | null>(null);

  escalatedItems = signal<PixPayoutRequest[]>([]);
  isLoadingEscalated = signal(false);
  errorEscalated = signal<string | null>(null);

  processingId = signal<string | null>(null);

  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');

  ngOnInit() {
    this.loadDisputed();
    this.loadEscalated();
  }

  setTab(tab: 'disputed' | 'escalated') {
    this.selectedTab.set(tab);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  loadDisputed() {
    this.isLoadingDisputed.set(true);
    this.errorDisputed.set(null);

    this.managerPayoutService.getDisputedRequests().subscribe({
      next: (items) => {
        this.disputedItems.set(items);
        this.isLoadingDisputed.set(false);
      },
      error: (error) => {
        console.error('Error loading disputed requests:', error);
        this.errorDisputed.set('Erro ao carregar disputas. Tente novamente.');
        this.isLoadingDisputed.set(false);
      }
    });
  }

  loadEscalated() {
    this.isLoadingEscalated.set(true);
    this.errorEscalated.set(null);

    this.managerPayoutService.getErrorEscalatedRequests().subscribe({
      next: (items) => {
        this.escalatedItems.set(items);
        this.isLoadingEscalated.set(false);
      },
      error: (error) => {
        console.error('Error loading escalated requests:', error);
        this.errorEscalated.set('Erro ao carregar escalacoes. Tente novamente.');
        this.isLoadingEscalated.set(false);
      }
    });
  }

  onConfirmDispute(id: string) {
    this.processingId.set(id);

    this.managerPayoutService.confirmDispute(id).subscribe({
      next: () => {
        this.disputedItems.set(this.disputedItems().filter(item => item.id !== id));
        this.processingId.set(null);
        this.showToast('Disputa confirmada com sucesso', 'success');
      },
      error: (error) => {
        this.processingId.set(null);
        this.showToast(error.message || 'Erro ao confirmar disputa', 'error');
      }
    });
  }

  onRejectDispute(id: string) {
    this.processingId.set(id);

    this.managerPayoutService.rejectDispute(id).subscribe({
      next: () => {
        this.disputedItems.set(this.disputedItems().filter(item => item.id !== id));
        this.processingId.set(null);
        this.showToast('Disputa rejeitada com sucesso', 'success');
      },
      error: (error) => {
        this.processingId.set(null);
        this.showToast(error.message || 'Erro ao rejeitar disputa', 'error');
      }
    });
  }

  onResolveEscalation(id: string) {
    this.processingId.set(id);

    this.managerPayoutService.resolveEscalation(id).subscribe({
      next: () => {
        this.escalatedItems.set(this.escalatedItems().filter(item => item.id !== id));
        this.processingId.set(null);
        this.showToast('Escalacao resolvida com sucesso', 'success');
      },
      error: (error) => {
        this.processingId.set(null);
        this.showToast(error.message || 'Erro ao resolver escalacao', 'error');
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

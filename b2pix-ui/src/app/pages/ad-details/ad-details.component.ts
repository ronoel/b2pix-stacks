import { Component, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';

import { Router, ActivatedRoute } from '@angular/router';
import { Advertisement, AdvertisementStatus, Deposit } from '../../shared/models/advertisement.model';
import { Buy } from '../../shared/models/buy.model';
import { PaymentRequest, PaymentRequestStatus, PaymentSourceType } from '../../shared/models/payment-request.model';
import { AdvertisementService } from '../../shared/api/advertisement.service';
import { BuyService } from '../../shared/api/buy.service';
import { PaymentRequestService } from '../../shared/api/payment-request.service';
import { environment } from '../../../environments/environment';

// Import sub-components
import { ListingCardComponent } from './components/listing-card.component';
import { RefundSectionComponent } from './components/refund-section.component';
import { BuysListComponent } from './components/buys-list.component';
import { DepositsModalComponent } from './components/deposits-modal.component';
import { EditAdvertisementModalComponent, EditAdvertisementData } from './components/edit-advertisement-modal.component';
import { AddFundModalComponent } from './components/add-fund-modal.component';

@Component({
  selector: 'app-ad-details',
  standalone: true,
  imports: [
    ListingCardComponent,
    RefundSectionComponent,
    BuysListComponent,
    DepositsModalComponent,
    EditAdvertisementModalComponent,
    AddFundModalComponent
],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="ad-details-modern">
      <div class="container">
        <div class="page-header">
          <button class="btn btn-ghost" (click)="goBack()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Voltar
          </button>
          <div class="header-content">
            <h1 class="page-title">Detalhes do Anúncio</h1>
            <p class="page-subtitle">Visualize as informações do anúncio e suas vendas</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-outline btn-sm" (click)="refreshData()" [disabled]="isLoading()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 12C3 7.02944 7.02944 3 12 3C14.5755 3 16.9 4.15205 18.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12C21 16.9706 16.9706 21 12 21C9.42446 21 7.09995 19.848 5.5 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13 2L18 6L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M11 22L6 18L10 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Atualizar
            </button>
          </div>
        </div>

        @if (isLoading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Carregando dados do anúncio...</p>
          </div>
        }

        @if (error() && !isLoading()) {
          <div class="error-state">
            <div class="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M15 9L9 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3>Erro ao carregar dados</h3>
            <p>{{ error() }}</p>
            <button class="btn btn-primary" (click)="retryLoadData()">Tentar Novamente</button>
          </div>
        }

        @if (!isLoading() && !error() && advertisement()) {
          <app-listing-card
            [advertisement]="advertisement()!"
            [canFinish]="canFinishAdvertisement()"
            [canEdit]="canEditAdvertisement()"
            [isFinishing]="isFinishing()"
            (finish)="finishAdvertisement()"
            (edit)="openEditModal()"
            (showDeposits)="showDeposits()"
            (addFund)="openAddFundModal()"
          />
        }

        @if (!isLoading() && !error() && refundPaymentRequest()) {
          <app-refund-section
            [refundPaymentRequest]="refundPaymentRequest()!"
            (openBlockchainExplorer)="openBlockchainExplorer($event)"
          />
        }

        @if (!isLoading() && !error() && advertisement()) {
          <app-buys-list [buys]="buys()" />
        }

        @if (showDepositsModal()) {
          <app-deposits-modal
            [deposits]="deposits()"
            [isLoading]="isLoadingDeposits()"
            [blockchainExplorerUrl]="getBlockchainExplorerUrl"
            (close)="closeDepositsModal()"
          />
        }

        @if (showEditModal()) {
          <app-edit-advertisement-modal
            [advertisement]="advertisement()!"
            [isSubmitting]="isUpdating()"
            (close)="closeEditModal()"
            (save)="saveAdvertisementChanges($event)"
          />
        }

        @if (showAddFundModal()) {
          <app-add-fund-modal
            [isSubmitting]="isAddingFund()"
            (close)="closeAddFundModal()"
            (addFund)="handleAddFund($event)"
          />
        }
      </div>
    </div>
  `,
  styles: [`
    .ad-details-modern {
      min-height: 100vh;
      background: #F8FAFC;
      padding: 24px 0;
      font-family: var(--font-family-primary);
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 16px;
    }
    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding-bottom: 16px;
      margin-bottom: 24px;
      border-bottom: 1px solid #E5E7EB;
    }
    .header-content {
      flex: 1;
    }
    .header-actions {
      display: flex;
      gap: 8px;
    }
    .page-title {
      font-size: 28px;
      font-weight: 700;
      color: #1F2937;
      margin: 0 0 6px 0;
    }
    .page-subtitle {
      font-size: 15px;
      color: #6B7280;
      margin: 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-primary {
      background: #1E40AF;
      color: white;
      border-color: #1E40AF;
    }
    .btn-primary:hover:not(:disabled) {
      background: #1D4ED8;
    }
    .btn-outline {
      background: transparent;
      color: #374151;
      border-color: #D1D5DB;
    }
    .btn-outline:hover:not(:disabled) {
      background: #F9FAFB;
    }
    .btn-ghost {
      background: transparent;
      color: #6B7280;
      border: none;
    }
    .btn-ghost:hover:not(:disabled) {
      background: #F3F4F6;
      color: #374151;
    }
    .btn-sm {
      padding: 8px 16px;
      font-size: 12px;
    }
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 40px 24px;
      text-align: center;
    }
    .loading-spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #E5E7EB;
      border-top: 3px solid #1E40AF;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 40px 24px;
      text-align: center;
      background: #FFFFFF;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }
    .error-icon {
      color: #EF4444;
    }
    .error-state h3 {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }
    .error-state p {
      color: #6B7280;
      margin: 0;
      font-size: 14px;
    }
    @media (max-width: 768px) {
      .ad-details-modern {
        padding: 20px 0;
      }
      .container {
        padding: 0 12px;
      }
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 20px;
        padding-bottom: 12px;
      }
      .page-title {
        font-size: 24px;
      }
      .page-subtitle {
        font-size: 14px;
      }
      .loading-state, .error-state {
        padding: 32px 20px;
      }
    }
  `]
})
export class AdDetailsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private advertisementService = inject(AdvertisementService);
  private buyService = inject(BuyService);
  private paymentRequestService = inject(PaymentRequestService);

  public isLoading = signal(false);
  public isFinishing = signal(false);
  public error = signal<string | null>(null);
  public advertisement = signal<Advertisement | null>(null);
  public buys = signal<Buy[]>([]);
  public refundPaymentRequest = signal<PaymentRequest | null>(null);
  public deposits = signal<Deposit[]>([]);
  public showDepositsModal = signal(false);
  public isLoadingDeposits = signal(false);
  public showEditModal = signal(false);
  public isUpdating = signal(false);
  public showAddFundModal = signal(false);
  public isAddingFund = signal(false);

  ngOnInit() {
    const advertisementId = this.route.snapshot.paramMap.get('advertisement_id');
    if (advertisementId) {
      this.loadData(advertisementId);
    } else {
      this.error.set('ID do anúncio não encontrado');
    }
  }

  goBack() {
    this.router.navigate(['/my-ads']);
  }

  refreshData() {
    const advertisementId = this.route.snapshot.paramMap.get('advertisement_id');
    if (advertisementId) {
      this.loadData(advertisementId);
    }
  }

  retryLoadData() {
    const advertisementId = this.route.snapshot.paramMap.get('advertisement_id');
    if (advertisementId) {
      this.loadData(advertisementId);
    }
  }

  canFinishAdvertisement(): boolean {
    const ad = this.advertisement();
    if (!ad) return false;

    // Can only finish advertisements that are READY or PENDING
    return ad.status === AdvertisementStatus.READY || ad.status === AdvertisementStatus.PENDING;
  }

  finishAdvertisement() {
    const ad = this.advertisement();
    if (!ad || !this.canFinishAdvertisement()) return;

    const confirmMessage = `Tem certeza que deseja finalizar este anúncio?

Esta ação irá:
• Fechar o anúncio permanentemente
• Impedir novas compras
• Requerer assinatura da carteira

Esta ação não pode ser desfeita.`;

    if (confirm(confirmMessage)) {
      this.isFinishing.set(true);

      this.advertisementService.finishAdvertisement(ad.id).subscribe({
        next: (updatedAd: Advertisement) => {
          this.advertisement.set(updatedAd);
          this.isFinishing.set(false);

          // Show success message
          alert('Anúncio finalizado com sucesso!');
        },
        error: (error: any) => {
          console.error('Error finishing advertisement:', error);
          this.isFinishing.set(false);

          // Show error message
          const errorMessage = error.message || 'Erro ao finalizar anúncio. Tente novamente.';
          alert(errorMessage);
        }
      });
    }
  }

  showDeposits() {
    const ad = this.advertisement();
    if (!ad) return;

    this.isLoadingDeposits.set(true);
    this.showDepositsModal.set(true);

    this.advertisementService.getAdvertisementDeposits(ad.id).subscribe({
      next: (deposits: Deposit[]) => {
        this.deposits.set(deposits);
        this.isLoadingDeposits.set(false);
      },
      error: (error: any) => {
        console.error('Error loading deposits:', error);
        this.deposits.set([]);
        this.isLoadingDeposits.set(false);
        alert('Erro ao carregar depósitos: ' + (error.message || 'Tente novamente'));
      }
    });
  }

  closeDepositsModal() {
    this.showDepositsModal.set(false);
    this.deposits.set([]);
  }

  canEditAdvertisement(): boolean {
    const ad = this.advertisement();
    if (!ad) return false;

    // Can only edit advertisements that are READY or PENDING
    return ad.status === AdvertisementStatus.READY || ad.status === AdvertisementStatus.PENDING;
  }

  openEditModal() {
    const ad = this.advertisement();
    if (!ad || !this.canEditAdvertisement()) return;

    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
  }

  openAddFundModal() {
    const ad = this.advertisement();
    if (!ad) return;

    this.showAddFundModal.set(true);
  }

  closeAddFundModal() {
    this.showAddFundModal.set(false);
  }

  handleAddFund(amountInSats: number) {
    const ad = this.advertisement();
    if (!ad) return;

    this.isAddingFund.set(true);

    // Create deposit via wallet transaction and API
    this.advertisementService.createDeposit(ad.id, BigInt(amountInSats)).subscribe({
      next: (response) => {
        this.isAddingFund.set(false);
        this.closeAddFundModal();

        // Show success message with deposit details
        const message = `✅ Depósito criado com sucesso!\n\nID do Depósito: ${response.deposit_id}\nQuantidade: ${amountInSats} sats\nStatus: ${response.status}\n\n${response.message}`;
        alert(message);

        // Refresh advertisement data to show updated balance
        const advertisementId = this.route.snapshot.paramMap.get('advertisement_id');
        if (advertisementId) {
          this.loadData(advertisementId);
        }
      },
      error: (error) => {
        console.error('Error creating deposit:', error);
        this.isAddingFund.set(false);

        // Show error message
        let errorMessage = 'Erro ao adicionar fundos. Tente novamente.';
        if (error.error && error.error.error) {
          errorMessage = error.error.error;
        } else if (error.message) {
          errorMessage = error.message;
        }

        alert(`❌ ${errorMessage}`);
      }
    });
  }

  saveAdvertisementChanges(data: EditAdvertisementData) {
    const ad = this.advertisement();
    if (!ad || !this.canEditAdvertisement()) return;

    this.isUpdating.set(true);

    this.advertisementService.updateAdvertisement(
      ad.id,
      data.pricingMode,
      data.pricingValue,
      data.minAmount,
      data.maxAmount
    ).subscribe({
      next: (updatedAd: Advertisement) => {
        this.advertisement.set(updatedAd);
        this.isUpdating.set(false);
        this.showEditModal.set(false);

        // Show success message
        alert('Anúncio atualizado com sucesso!');
      },
      error: (error: any) => {
        console.error('Error updating advertisement:', error);
        this.isUpdating.set(false);

        // Show error message
        const errorMessage = error.message || 'Erro ao atualizar anúncio. Tente novamente.';
        alert(errorMessage);
      }
    });
  }

  private loadData(advertisementId: string) {
    this.isLoading.set(true);
    this.error.set(null);

    // Load advertisement details
    this.advertisementService.getAdvertisementById(advertisementId).subscribe({
      next: (ad: Advertisement) => {
        this.advertisement.set(ad);

        // Load buys for this advertisement
        this.buyService.getBuysByAdvertisementId(advertisementId).subscribe({
          next: (buys: Buy[]) => {
            this.buys.set(buys);
            this.isLoading.set(false);
          },
          error: (error: any) => {
            console.error('Error loading buys:', error);
            this.buys.set([]);
            this.isLoading.set(false);
          }
        });

        // Load refund payment request if advertisement is closed with available amount
        if (ad.status === AdvertisementStatus.CLOSED && ad.available_amount > 0) {
          this.paymentRequestService.getPaymentRequestsBySource(PaymentSourceType.Advertisement, advertisementId).subscribe({
            next: (response) => {
              if (response.data && response.data.length > 0) {
                this.refundPaymentRequest.set(response.data[0]);
              }
            },
            error: (error: any) => {
              console.error('Error loading refund payment request:', error);
            }
          });
        } else {
          this.refundPaymentRequest.set(null);
        }
      },
      error: (error: any) => {
        console.error('Error loading advertisement:', error);
        this.error.set('Erro ao carregar anúncio');
        this.isLoading.set(false);
      }
    });
  }

  // Generate blockchain explorer link
  getBlockchainExplorerUrl = (txId: string): string => {
    const transactionId = txId.startsWith('0x') ? txId : `0x${txId}`;
    const chain = environment.network === 'mainnet' ? 'mainnet' : 'testnet';
    return `https://explorer.hiro.so/txid/${transactionId}?chain=${chain}`;
  }

  openBlockchainExplorer(transactionId: string) {
    const url = this.getBlockchainExplorerUrl(transactionId);
    window.open(url, '_blank');
  }
}

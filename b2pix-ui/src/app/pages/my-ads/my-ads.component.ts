import { Component, inject, OnInit, signal, computed, OnDestroy, effect, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { Advertisement, AdvertisementStatus } from '../../shared/models/advertisement.model';
import { AdvertisementService } from '../../shared/api/advertisement.service';
import { InvitesService } from '../../shared/api/invites.service';
import { WalletService } from '../../libs/wallet.service';
import { LoadingService } from '../../services/loading.service';
import { ListingCardComponent } from '../../components/listing-card/listing-card.component';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-my-ads',
  standalone: true,
  imports: [ListingCardComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="my-ads-page">
      <div class="container">
        <!-- Page Header -->
        <div class="page-header">
          <button class="btn btn-ghost" (click)="goBack()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Voltar
          </button>
          <div class="header-content">
            <h1 class="page-title">Vender Bitcoin</h1>
            <p class="page-subtitle">Gerencie todos os seus anúncios de Bitcoin</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-outline btn-sm" (click)="loadUserAds()" [disabled]="isLoading()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 12C3 7.02944 7.02944 3 12 3C14.5755 3 16.9 4.15205 18.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12C21 16.9706 16.9706 21 12 21C9.42446 21 7.09995 19.848 5.5 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13 2L18 6L14 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M11 22L6 18L10 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Atualizar
            </button>
            <button class="btn btn-success" (click)="createNewAd()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              Criar Anúncio
            </button>
          </div>
        </div>

        <!-- PIX Account Section -->
        <div class="pix-account-section">
          <h2 class="section-title">Conta PIX</h2>
          <div class="pix-account-card">
            <div class="pix-account-content">
              <div class="pix-account-info">
                <div class="pix-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="pix-info">
                  <div class="pix-title">Status da Conta PIX</div>
                  <div class="pix-status">{{ getPixStatusMessage() }}</div>
                  <div class="pix-description">{{ getPixDescriptionMessage() }}</div>
                </div>
              </div>
              <div class="pix-account-actions">
                <button class="btn btn-primary" (click)="goToPixAccount()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H16C17.1046 20 18 19.1046 18 18V11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  {{ getPixButtonText() }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Ads List Section -->
        <div class="ads-list-section">
          <h2 class="section-title">Anúncios</h2>
          <div class="ads-grid">
            @for (ad of filteredAds(); track trackByAdId($index, ad)) {
              <app-listing-card
                [ad]="ad"
                (cardClick)="viewAdDetails($event)">
              </app-listing-card>
            }
          </div>
          @if (filteredAds().length === 0) {
            <div class="no-ads">
              <div class="no-ads-content">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M10 9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <h3>Você ainda não tem anúncios</h3>
                <p>Crie seu primeiro anúncio para começar a vender criptomoedas.</p>
                <button class="btn btn-primary" (click)="createNewAd()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Criar Anúncio
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .my-ads-page {
      min-height: 100vh;
      background: #F8FAFC;
      padding: 0;
    }

    .my-ads-page .header-actions {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .my-ads-page .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
      margin: 0 0 16px 0;
    }

    /* PIX Account Section */
    .my-ads-page .pix-account-section {
      margin-bottom: 24px;
    }

    .my-ads-page .pix-account-card {
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 20px;
    }

    .my-ads-page .pix-account-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .my-ads-page .pix-account-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .my-ads-page .pix-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      color: #FFFFFF;
      flex-shrink: 0;
    }

    .my-ads-page .pix-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .my-ads-page .pix-title {
      font-size: 15px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
    }

    .my-ads-page .pix-status {
      font-size: 13px;
      color: #374151;
      margin: 0;
      font-weight: 500;
    }

    .my-ads-page .pix-description {
      font-size: 12px;
      color: #6B7280;
      margin: 0;
    }

    .my-ads-page .pix-account-actions {
      flex-shrink: 0;
    }

    /* Ads List Section */
    .my-ads-page .ads-list-section {
      margin-top: 24px;
    }

    .my-ads-page .ads-grid {
      display: grid;
      gap: 16px;
    }

    .my-ads-page .no-ads {
      text-align: center;
      padding: 40px 20px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
    }

    .my-ads-page .no-ads-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .my-ads-page .no-ads svg {
      color: #9CA3AF;
    }

    .my-ads-page .no-ads h3 {
      font-size: 18px;
      color: #1F2937;
      margin: 0;
      font-weight: 600;
    }

    .my-ads-page .no-ads p {
      color: #6B7280;
      margin: 0;
      font-size: 14px;
    }

    .my-ads-page .ad-main-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 28px;
    }

    .my-ads-page .ad-details {
      background: linear-gradient(135deg, #F8FAFC, #F1F5F9);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
      border: 2px solid #E2E8F0;
      transition: all 0.3s ease;
    }

    .my-ads-page .ad-details:hover {
      border-color: #3B82F6;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.1);
    }

    .my-ads-page .detail-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 16px;
    }

    .my-ads-page .detail-row:last-child {
      margin-bottom: 0;
    }

    .my-ads-page .detail-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 10px;
      transition: all 0.3s ease;
    }

    .my-ads-page .detail-item:hover {
      background: rgba(255, 255, 255, 1);
      transform: translateY(-1px);
    }

    .my-ads-page .blockchain-item {
      grid-column: 1 / -1;
    }

    .my-ads-page .detail-label {
      font-size: 11px;
      color: #64748B;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .my-ads-page .detail-value {
      font-weight: 700;
      color: #1F2937;
      font-size: 14px;
    }

    .my-ads-page .blockchain-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
      padding: 8px 12px;
      background: linear-gradient(135deg, #3B82F6, #1D4ED8);
      color: #FFFFFF;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .my-ads-page .blockchain-link:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
      background: linear-gradient(135deg, #1D4ED8, #1E40AF);
    }

    .my-ads-page .ad-progress {
      margin-top: 20px;
      padding: 16px;
      background: linear-gradient(135deg, #F0F9FF, #E0F2FE);
      border-radius: 12px;
      border: 1px solid #BAE6FD;
    }

    .my-ads-page .progress-bar {
      width: 100%;
      height: 8px;
      background: #E2E8F0;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 12px;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .my-ads-page .progress-fill {
      height: 100%;
      background: linear-gradient(135deg, #10B981, #059669, #047857);
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 6px;
      position: relative;
    }

    .my-ads-page .progress-fill::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .my-ads-page .progress-text {
      font-size: 12px;
      color: #047857;
      text-align: center;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .my-ads-page .header-actions {
        width: 100%;
        justify-content: space-between;
      }

      .my-ads-page .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .my-ads-page .filter-buttons {
        width: 100%;
        justify-content: space-between;
      }

      .my-ads-page .ad-main-info {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .my-ads-page .detail-row {
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .my-ads-page .pix-account-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .my-ads-page .pix-account-actions {
        width: 100%;
      }

      .my-ads-page .pix-account-actions .btn {
        width: 100%;
      }
    }
  `]
})
export class MyAdsComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private advertisementService = inject(AdvertisementService);
  private invitesService = inject(InvitesService);
  private walletService = inject(WalletService);
  private loadingService = inject(LoadingService);

  // Signals for reactive state management
  myAds = signal<Advertisement[]>([]);
  selectedFilter = signal<'all' | 'active' | 'inactive'>('all');
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  hasPixAccount = false;
  bankStatus = signal<'pending' | 'processing' | 'success' | 'failed'>('pending');

  private subscription?: Subscription;

  // Computed signals
  userAddress = computed(() => this.walletService.walletAddressSignal());

  constructor() {
    // Effect to reload ads when wallet address changes
    effect(() => {
      const address = this.userAddress();
      if (address) {
        this.loadUserAds();
        this.checkPixAccount();
      }
    });
  }

  ngOnInit() {
    // Initial load will be handled by the effect
    this.checkPixAccount();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  // Load user advertisements from API
  loadUserAds() {
    const address = this.userAddress();
    
    if (!address) {
      this.error.set('Endereço da carteira não encontrado');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    
    this.subscription = this.advertisementService.getAdvertisementByAddress(address).subscribe({
      next: (ads: Advertisement[]) => {
        this.myAds.set(ads);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading user ads:', error);
        this.error.set('Erro ao carregar anúncios. Tente novamente.');
        this.isLoading.set(false);
        // Set empty array on error
        this.myAds.set([]);
      }
    });
  }

  // Computed properties
  filteredAds() {
    const ads = this.myAds();
    const filter = this.selectedFilter();

    let filteredAds: Advertisement[];

    if (filter === 'active') {
      filteredAds = ads.filter(ad => ad.is_active && (ad.status === AdvertisementStatus.READY || ad.status === AdvertisementStatus.PENDING));
    } else if (filter === 'inactive') {
      filteredAds = ads.filter(ad => !ad.is_active || ad.status === AdvertisementStatus.CLOSED || ad.status === AdvertisementStatus.DISABLED);
    } else {
      filteredAds = ads;
    }

    // Sort by creation date - most recent first
    return filteredAds.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA; // Descending order (most recent first)
    });
  }

  getActiveAdsCount(): number {
    return this.myAds().filter(ad => 
      ad.is_active && (ad.status === AdvertisementStatus.READY || ad.status === AdvertisementStatus.PENDING)
    ).length;
  }

  getTotalEarnings(): number {
    return this.myAds()
      .filter(ad => ad.status === AdvertisementStatus.CLOSED)
      .reduce((total, ad) => {
        const soldAmount = ad.total_deposited - ad.available_amount;
        // Only count earnings for fixed-price advertisements
        if (ad.price !== undefined) {
          // Convert from cents per Bitcoin to BRL per Bitcoin
          const priceCentsPerBtc = ad.price;
          const priceReaisPerBtc = priceCentsPerBtc / 100;
          const earnings = (soldAmount / 100000000) * priceReaisPerBtc;
          return total + earnings;
        }
        return total;
      }, 0);
  }

  // Navigation methods
  goBack() {
    this.router.navigate(['/dashboard']);
  }

  createNewAd() {
    this.router.navigate(['/sell']);
  }

  refreshAds() {
    this.loadUserAds();
    this.checkPixAccount();
  }

  goToPixAccount() {
    this.router.navigate(['/pix-account']);
  }

  // PIX Account methods
  private checkPixAccount() {
    this.invitesService.getWalletInvite().subscribe({
      next: (invite) => {
        if (invite) {
          this.bankStatus.set(invite.bank_status);
          // 'success' indica que a conta PIX foi configurada com sucesso
          this.hasPixAccount = invite.bank_status === 'success';
        } else {
          this.bankStatus.set('pending');
          this.hasPixAccount = false;
        }
      },
      error: (error) => {
        console.error('Error checking PIX account status:', error);
        this.bankStatus.set('failed');
        this.hasPixAccount = false;
      }
    });
  }

  getPixStatusMessage(): string {
    switch (this.bankStatus()) {
      case 'success':
        return 'Conta Ativa';
      case 'processing':
        return 'Em Processamento';
      case 'failed':
        return 'Falha na Configuração';
      case 'pending':
      default:
        return 'Conta Pendente';
    }
  }

  getPixDescriptionMessage(): string {
    switch (this.bankStatus()) {
      case 'success':
        return 'Sua conta PIX está configurada e ativa para transações.';
      case 'processing':
        return 'Sua conta PIX está sendo processada. Aguarde a confirmação.';
      case 'failed':
        return 'Houve um erro na configuração da conta PIX. Tente novamente.';
      case 'pending':
      default:
        return 'Configure sua conta PIX para receber pagamentos.';
    }
  }

  getPixButtonText(): string {
    switch (this.bankStatus()) {
      case 'success':
        return 'Editar Conta PIX';
      case 'processing':
        return 'Verificar Status';
      case 'failed':
        return 'Tentar Novamente';
      case 'pending':
      default:
        return 'Configurar Conta PIX';
    }
  }

  // Ad management methods
  viewAdDetails(ad: Advertisement) {
    this.router.navigate(['/my-ads', ad.id]);
  }

  // Utility methods
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  // Generate blockchain explorer link
  getBlockchainExplorerLink(transactionId: string): string {
    // Add 0x prefix if not present and generate Hiro explorer link
    const txId = transactionId.startsWith('0x') ? transactionId : `0x${transactionId}`;
    const chain = environment.network === 'mainnet' ? 'mainnet' : 'testnet';
    return `https://explorer.hiro.so/txid/${txId}?chain=${chain}`;
  }

  openBlockchainExplorer(transactionId: string): void {
    const url = this.getBlockchainExplorerLink(transactionId);
    window.open(url, '_blank');
  }

  trackByAdId(index: number, ad: Advertisement): string {
    return ad.id;
  }
}

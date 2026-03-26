import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { InvoiceCardComponent } from './components/invoice-card.component';
import { InvoiceCreateSheetComponent } from './components/invoice-create-sheet.component';
import { InvoiceApiService } from '../../shared/api/invoice.service';
import { AccountValidationService } from '../../shared/api/account-validation.service';
import { WalletManagerService } from '../../libs/wallet/wallet-manager.service';
import { Invoice, InvoiceStatus } from '../../shared/models/invoice.model';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [PageHeaderComponent, InvoiceCardComponent, InvoiceCreateSheetComponent],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss'
})
export class InvoicesComponent implements OnInit {
  private router = inject(Router);
  private invoiceApi = inject(InvoiceApiService);
  private accountValidation = inject(AccountValidationService);
  private walletManager = inject(WalletManagerService);

  invoices = signal<Invoice[]>([]);
  isLoading = signal(true);
  hasMore = signal(false);
  currentPage = signal(1);
  invoiceEnabled = signal(false);
  showCreateSheet = signal(false);

  readonly MAX_ACTIVE_INVOICES = 5;

  get activeCount(): number {
    return this.invoices().filter(i => i.status === InvoiceStatus.Active).length;
  }

  get canCreate(): boolean {
    return this.invoiceEnabled() && this.activeCount < this.MAX_ACTIVE_INVOICES;
  }

  ngOnInit(): void {
    this.accountValidation.getAccount().subscribe({
      next: (account) => {
        this.invoiceEnabled.set(account.invoice_enabled === true);
        if (this.invoiceEnabled()) {
          this.loadInvoices();
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  loadInvoices(): void {
    const address = this.walletManager.getSTXAddress();
    if (!address) return;

    this.isLoading.set(true);
    this.invoiceApi.getInvoicesByAddress(address, { page: 1, limit: 20 }).subscribe({
      next: (response) => {
        this.invoices.set(response.invoices);
        this.hasMore.set(response.has_more);
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  loadMore(): void {
    const address = this.walletManager.getSTXAddress();
    if (!address) return;

    const nextPage = this.currentPage() + 1;
    this.invoiceApi.getInvoicesByAddress(address, { page: nextPage, limit: 20 }).subscribe({
      next: (response) => {
        this.invoices.update(current => [...current, ...response.invoices]);
        this.hasMore.set(response.has_more);
        this.currentPage.set(nextPage);
      }
    });
  }

  onInvoiceSelect(invoice: Invoice): void {
    this.router.navigate(['/invoices', invoice.id]);
  }

  onInvoiceCreated(invoice: Invoice): void {
    this.showCreateSheet.set(false);
    this.router.navigate(['/invoices', invoice.id]);
  }
}

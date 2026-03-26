import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Invoice, getInvoiceStatusLabel, getInvoiceStatusClass } from '../../../shared/models/invoice.model';
import { formatBrlCents, formatDateTime } from '../../../shared/utils/format.util';

@Component({
  selector: 'app-invoice-card',
  standalone: true,
  template: `
    <div class="order-card" (click)="select.emit(invoice)">
      <div class="order-main">
        <div class="order-left">
          <p class="order-amount">{{ formatBrlCents(invoice.value_brl) }}</p>
          <p class="order-detail font-mono">
            @if (invoice.label) {
              {{ invoice.label }} &middot;
            }
            {{ formatDateTime(invoice.created_at) }}
          </p>
        </div>
        <span class="badge" [class]="'badge-' + getStatusClass(invoice.status)">
          {{ getStatusLabel(invoice.status) }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    .order-card {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: 14px 16px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .order-card:hover {
      border-color: var(--border-light);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .order-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .order-left {
      flex: 1;
      min-width: 0;
    }
    .order-amount {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }
    .order-detail {
      font-size: 12px;
      color: var(--text-muted);
      margin: 4px 0 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class InvoiceCardComponent {
  @Input({ required: true }) invoice!: Invoice;
  @Output() select = new EventEmitter<Invoice>();

  formatBrlCents = formatBrlCents;
  formatDateTime = formatDateTime;
  getStatusLabel = getInvoiceStatusLabel;
  getStatusClass = getInvoiceStatusClass;
}

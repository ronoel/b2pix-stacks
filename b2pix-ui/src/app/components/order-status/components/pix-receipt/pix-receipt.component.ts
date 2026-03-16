import { Component, input, signal, viewChild, ElementRef } from '@angular/core';
import { PixPayoutRequest } from '../../../../shared/models/pix-payout-request.model';
import { CommonOrder } from '../../../../shared/models/pix-payment.model';
import { formatBrlCents, formatDateTime } from '../../../../shared/utils/format.util';

@Component({
  selector: 'app-pix-receipt',
  standalone: true,
  templateUrl: './pix-receipt.component.html',
  styleUrl: './pix-receipt.component.scss'
})
export class PixReceiptComponent {
  payoutRequest = input.required<PixPayoutRequest>();
  order = input.required<CommonOrder>();

  e2eCopied = signal(false);
  isExporting = signal(false);
  receiptEl = viewChild<ElementRef>('receiptCard');

  get formattedValue(): string {
    return formatBrlCents(this.order().pix_value!);
  }

  get formattedDate(): string {
    const pr = this.payoutRequest();
    const dateStr = pr.pix_settled_at ?? pr.confirmed_at;
    return dateStr ? formatDateTime(dateStr) : '—';
  }

  get e2eId(): string {
    return this.payoutRequest().pix_end_to_end_id ?? '';
  }

  get recipientName(): string | null {
    return this.payoutRequest().pix_recipient_name;
  }

  get recipientDoc(): string | null {
    return this.payoutRequest().pix_recipient_doc;
  }

  copyE2eId() {
    if (!this.e2eId) return;
    navigator.clipboard.writeText(this.e2eId).then(() => {
      this.e2eCopied.set(true);
      setTimeout(() => this.e2eCopied.set(false), 2000);
    });
  }

  async shareReceipt() {
    this.isExporting.set(true);
    try {
      const blob = await this.renderToBlob();
      if (!blob) return;

      const file = new File([blob], this.getFilename(), { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Comprovante PIX',
            text: 'Comprovante de pagamento PIX via b2pix.org'
          });
        } catch (err: any) {
          if (err?.name !== 'AbortError') {
            this.downloadBlob(blob);
          }
        }
      } else {
        this.downloadBlob(blob);
      }
    } finally {
      this.isExporting.set(false);
    }
  }

  async saveImage() {
    this.isExporting.set(true);
    try {
      const blob = await this.renderToBlob();
      if (blob) this.downloadBlob(blob);
    } finally {
      this.isExporting.set(false);
    }
  }

  private async renderToBlob(): Promise<Blob | null> {
    const el = this.receiptEl()?.nativeElement;
    if (!el) return null;

    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: '#FFFFFF',
      useCORS: true
    });

    return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
  }

  private downloadBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.getFilename();
    a.click();
    URL.revokeObjectURL(url);
  }

  private getFilename(): string {
    const id = this.e2eId ? this.e2eId.substring(0, 20) : 'receipt';
    return `comprovante-pix-${id}.png`;
  }
}

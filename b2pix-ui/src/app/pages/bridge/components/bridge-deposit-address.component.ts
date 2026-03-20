import { Component, input, signal, inject, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { qrcode } from '@libs/qrcode';

@Component({
  selector: 'app-bridge-deposit-address',
  standalone: true,
  templateUrl: './bridge-deposit-address.component.html',
  styleUrl: './bridge-deposit-address.component.scss',
})
export class BridgeDepositAddressComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);

  address = input.required<string>();
  maxSignerFee = input<number>(4000);

  qrSvg = signal<SafeHtml>('');
  addressCopied = signal(false);

  ngOnInit(): void {
    const svg = qrcode(`bitcoin:${this.address()}`, { ecl: 'M' });
    this.qrSvg.set(this.sanitizer.bypassSecurityTrustHtml(svg));
  }

  copyAddress(): void {
    navigator.clipboard.writeText(this.address()).then(() => {
      this.addressCopied.set(true);
      setTimeout(() => this.addressCopied.set(false), 2000);
    });
  }

  formatSats(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }
}

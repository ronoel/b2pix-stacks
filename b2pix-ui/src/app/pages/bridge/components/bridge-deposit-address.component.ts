import { Component, input, output, signal, inject, effect, OnInit } from '@angular/core';
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
  notifying = input<boolean>(false);
  notified = input<boolean>(false);

  notifyDeposit = output<string>();

  qrSvg = signal<SafeHtml>('');
  addressCopied = signal(false);
  depositStep = signal<1 | 2>(1);
  btcTxidInput = signal('');

  constructor() {
    effect(() => {
      this.depositStep();
      window.scrollTo({ top: 0 });
    });
  }

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

  submitNotify(): void {
    const txid = this.btcTxidInput().trim();
    if (txid.length === 64) {
      this.notifyDeposit.emit(txid);
    }
  }
}

import { Component, Input, OnInit, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { qrcode } from '@libs/qrcode';

@Component({
  selector: 'app-pix-copia-cola',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pix-copia-cola.component.html',
  styleUrl: './pix-copia-cola.component.scss'
})
export class PixCopiaColaComponent implements OnInit, OnChanges {
  private sanitizer = inject(DomSanitizer);

  @Input() pixKey = '';
  @Input() amount?: number;
  @Input() sellerName = 'VENDEDOR';
  @Input() sellerCity = 'BRASILIA';
  @Input() showLabel = true;
  @Input() labelText = 'PIX Copia e Cola';
  @Input() labelNumber = '';

  showQrCode = signal(false);
  qrCodeSvg = signal<SafeHtml>('');
  pixPayload = signal('');
  pixPayloadCopied = signal(false);

  ngOnInit() {
    this.generatePayload();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['pixKey'] || changes['amount'] || changes['sellerName'] || changes['sellerCity']) {
      this.generatePayload();
    }
  }

  private generatePayload() {
    if (this.pixKey) {
      this.pixPayload.set(this.generatePixPayload(this.pixKey, this.amount));
    }
  }

  generateAndShowQrCode() {
    const svg = qrcode(this.pixPayload(), { ecl: 'M' });
    this.qrCodeSvg.set(this.sanitizer.bypassSecurityTrustHtml(svg));
    this.showQrCode.set(true);
  }

  closeQrCode() {
    this.showQrCode.set(false);
  }

  copyPixPayload() {
    navigator.clipboard.writeText(this.pixPayload()).then(() => {
      this.pixPayloadCopied.set(true);
      setTimeout(() => this.pixPayloadCopied.set(false), 2000);
    });
  }

  private generatePixPayload(key: string, amount?: number): string {
    const merchantAccount = this.genEMV('00', 'BR.GOV.BCB.PIX') + this.genEMV('01', key);

    const name = this.sellerName
      .substring(0, 25)
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const city = this.sellerCity
      .substring(0, 15)
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const payload: string[] = [
      this.genEMV('00', '01'),                                  // Payload Format Indicator
      this.genEMV('26', merchantAccount),                        // Merchant Account Information
      this.genEMV('52', '0000'),                                 // Merchant Category Code
      this.genEMV('53', '986'),                                  // Transaction Currency (BRL)
    ];

    if (amount && amount > 0) {
      payload.push(this.genEMV('54', amount.toFixed(2)));        // Transaction Amount
    }

    payload.push(this.genEMV('58', 'BR'));                       // Country Code
    payload.push(this.genEMV('59', name));                       // Merchant Name
    payload.push(this.genEMV('60', city));                       // Merchant City
    payload.push(this.genEMV('62', this.genEMV('05', '***')));   // Additional Data (Transaction ID)
    payload.push('6304');                                         // CRC16 placeholder

    const stringPayload = payload.join('');
    const crc = this.crc16Ccitt(stringPayload);
    return stringPayload + crc;
  }

  private genEMV(id: string, parameter: string): string {
    const len = parameter.length.toString().padStart(2, '0');
    return `${id}${len}${parameter}`;
  }

  private crc16Ccitt(data: string): string {
    let crc = 0xFFFF;
    const polynomial = 0x1021;
    const bytes = new TextEncoder().encode(data);

    for (const byte of bytes) {
      crc ^= (byte << 8);
      for (let i = 0; i < 8; i++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc <<= 1;
        }
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
}

import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pix-key-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pix-key-input.component.html',
  styleUrl: './pix-key-input.component.scss'
})
export class PixKeyInputComponent {
  @Input() disabled = signal(false);
  @Output() valueChange = new EventEmitter<string>();
  @Output() validChange = new EventEmitter<boolean>();

  value = signal('');
  displayValue = signal('');
  isValid = signal(false);

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value.replace(/\D/g, '');

    this.value.set(rawValue);
    this.displayValue.set(this.formatPixKey(rawValue));
    this.isValid.set(this.validatePixKey(rawValue));

    this.valueChange.emit(rawValue);
    this.validChange.emit(this.isValid());

    // Atualizar o input com valor formatado
    input.value = this.displayValue();
  }

  private formatPixKey(value: string): string {
    if (value.length <= 11) {
      // CPF: 000.000.000-00
      return value
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // CNPJ: 00.000.000/0000-00
      return value
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  }

  private validatePixKey(value: string): boolean {
    if (value.length === 11) {
      return this.validateCPF(value);
    } else if (value.length === 14) {
      return this.validateCNPJ(value);
    }
    return false;
  }

  private validateCPF(cpf: string): boolean {
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cpf)) return false;

    // Validação básica de CPF
    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;

    return true;
  }

  private validateCNPJ(cnpj: string): boolean {
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cnpj)) return false;

    // Validação básica de CNPJ
    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    const digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;

    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;

    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
  }

  getDocumentType(): string {
    const length = this.value().length;
    if (length === 11) return 'CPF';
    if (length === 14) return 'CNPJ';
    return '';
  }
}

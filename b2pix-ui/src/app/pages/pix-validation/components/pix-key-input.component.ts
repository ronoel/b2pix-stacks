import { Component, Input, Output, EventEmitter, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PixKeyType,
  detectPixKeyType,
  getPixKeyTypeLabel,
  normalizePixKey
} from '../../../shared/utils/pix-validation.util';

@Component({
  selector: 'app-pix-key-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './pix-key-input.component.html',
  styleUrl: './pix-key-input.component.scss'
})
export class PixKeyInputComponent {
  @Input() disabled = signal(false);
  @Output() valueChange = new EventEmitter<string>();
  @Output() validChange = new EventEmitter<boolean>();

  pixKeyValue = signal('');
  detectedKeyType = signal<PixKeyType | null>(null);
  isValid = signal(false);
  keyTouched = signal(false);

  constructor() {
    effect(() => {
      const key = this.pixKeyValue().trim();
      if (key.length === 0) {
        this.detectedKeyType.set(null);
        this.isValid.set(false);
        this.validChange.emit(false);
        this.valueChange.emit('');
        return;
      }
      const type = detectPixKeyType(key);
      this.detectedKeyType.set(type);
      this.isValid.set(type !== null);
      this.validChange.emit(type !== null);
      this.valueChange.emit(type !== null ? normalizePixKey(key) : '');
    });
  }

  keyTypeLabel = computed(() => {
    const type = this.detectedKeyType();
    return type ? getPixKeyTypeLabel(type) : '';
  });

  keyError = computed(() => {
    if (!this.keyTouched() || this.pixKeyValue().trim().length === 0) return '';
    if (!this.isValid()) {
      return 'Chave PIX inválida. Formatos aceitos: CPF, CNPJ, telefone (+55), e-mail ou chave aleatória (UUID).';
    }
    return '';
  });

  onKeyBlur(): void {
    this.keyTouched.set(true);
  }
}

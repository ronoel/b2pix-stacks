import { Component, Output, EventEmitter, signal, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-code-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="code-input-container">
      <div class="code-inputs">
        @for (digit of digits(); track $index) {
          <input
            #codeInput
            type="text"
            inputmode="numeric"
            maxlength="1"
            class="code-digit"
            [value]="digit"
            (input)="onInput($index, $event)"
            (keydown)="onKeyDown($index, $event)"
            (paste)="onPaste($event)"
          />
        }
      </div>
    </div>
  `,
  styles: [`
    .code-input-container {
      display: flex;
      justify-content: center;
      margin: 1.5rem 0;
    }

    .code-inputs {
      display: flex;
      gap: 0.5rem;
    }

    .code-digit {
      width: 3rem;
      height: 3.5rem;
      text-align: center;
      font-size: 1.5rem;
      font-weight: 600;
      border: 2px solid #dee2e6;
      border-radius: 0.5rem;
      transition: all 0.2s;
    }

    .code-digit:focus {
      outline: none;
      border-color: #0d6efd;
      box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
    }

    .code-digit:not(:placeholder-shown) {
      border-color: #198754;
    }
  `]
})
export class CodeInputComponent implements AfterViewInit {
  @Output() codeComplete = new EventEmitter<string>();
  @Output() codeChange = new EventEmitter<string>();
  @ViewChildren('codeInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  digits = signal<string[]>(['', '', '', '', '', '']);

  ngAfterViewInit(): void {
    // Auto-focus no primeiro input
    setTimeout(() => {
      this.inputs.first?.nativeElement.focus();
    }, 100);
  }

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9]/g, '');

    if (value) {
      // Atualizar o dígito
      const newDigits = [...this.digits()];
      newDigits[index] = value;
      this.digits.set(newDigits);

      // Mover para o próximo input
      if (index < 5) {
        this.inputs.get(index + 1)?.nativeElement.focus();
      }

      // Verificar se completou
      this.checkComplete(newDigits);
    }
  }

  onKeyDown(index: number, event: KeyboardEvent): void {
    // Backspace - voltar para o input anterior
    if (event.key === 'Backspace') {
      const newDigits = [...this.digits()];

      if (newDigits[index] === '' && index > 0) {
        // Se vazio, limpar o anterior e voltar
        newDigits[index - 1] = '';
        this.digits.set(newDigits);
        this.inputs.get(index - 1)?.nativeElement.focus();
      } else {
        // Limpar o atual
        newDigits[index] = '';
        this.digits.set(newDigits);
      }

      this.codeChange.emit(newDigits.join(''));
      event.preventDefault();
    }

    // Setas
    if (event.key === 'ArrowLeft' && index > 0) {
      this.inputs.get(index - 1)?.nativeElement.focus();
      event.preventDefault();
    }
    if (event.key === 'ArrowRight' && index < 5) {
      this.inputs.get(index + 1)?.nativeElement.focus();
      event.preventDefault();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text');

    if (pastedData) {
      const numbers = pastedData.replace(/[^0-9]/g, '').slice(0, 6);
      const newDigits = numbers.split('').concat(Array(6).fill('')).slice(0, 6);
      this.digits.set(newDigits);

      // Focar no último dígito preenchido ou no próximo vazio
      const nextEmptyIndex = newDigits.findIndex(d => d === '');
      const focusIndex = nextEmptyIndex === -1 ? 5 : Math.max(0, nextEmptyIndex);
      setTimeout(() => {
        this.inputs.get(focusIndex)?.nativeElement.focus();
      }, 0);

      this.checkComplete(newDigits);
    }
  }

  private checkComplete(digits: string[]): void {
    const code = digits.join('');
    this.codeChange.emit(code);

    if (code.length === 6) {
      this.codeComplete.emit(code);
    }
  }

  clear(): void {
    this.digits.set(['', '', '', '', '', '']);
    this.inputs.first?.nativeElement.focus();
  }
}

import { Component, Output, EventEmitter, signal, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-code-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './code-input.component.html',
  styleUrl: './code-input.component.scss'
})
export class CodeInputComponent implements AfterViewInit {
  @Output() codeComplete = new EventEmitter<string>();
  @Output() codeChange = new EventEmitter<string>();
  @ViewChildren('codeInput') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  digits = signal<string[]>(['', '', '', '', '', '']);

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.inputs.first?.nativeElement.focus();
    }, 100);
  }

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9]/g, '');

    if (value) {
      const newDigits = [...this.digits()];
      newDigits[index] = value;
      this.digits.set(newDigits);

      if (index < 5) {
        this.inputs.get(index + 1)?.nativeElement.focus();
      }

      this.checkComplete(newDigits);
    }
  }

  onKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      const newDigits = [...this.digits()];

      if (newDigits[index] === '' && index > 0) {
        newDigits[index - 1] = '';
        this.digits.set(newDigits);
        this.inputs.get(index - 1)?.nativeElement.focus();
      } else {
        newDigits[index] = '';
        this.digits.set(newDigits);
      }

      this.codeChange.emit(newDigits.join(''));
      event.preventDefault();
    }

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

      requestAnimationFrame(() => {
        this.inputs.forEach((input, index) => {
          input.nativeElement.value = newDigits[index];
        });

        const nextEmptyIndex = newDigits.findIndex(d => d === '');
        const focusIndex = nextEmptyIndex === -1 ? 5 : Math.max(0, nextEmptyIndex);
        this.inputs.get(focusIndex)?.nativeElement.focus();

        this.checkComplete(newDigits);
      });
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

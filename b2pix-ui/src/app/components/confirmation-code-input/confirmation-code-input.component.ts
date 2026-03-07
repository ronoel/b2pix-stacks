import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';

@Component({
  selector: 'app-confirmation-code-input',
  standalone: true,
  imports: [],
  templateUrl: './confirmation-code-input.component.html',
  styleUrl: './confirmation-code-input.component.scss'
})
export class ConfirmationCodeInputComponent {
  @Input() disabled = false;
  @Output() codeChange = new EventEmitter<string>();
  @Output() noCodeChange = new EventEmitter<boolean>();

  char0 = signal('');
  char1 = signal('');
  char2 = signal('');
  noCode = signal(false);

  code = computed(() => (this.char0() + this.char1() + this.char2()).toUpperCase());

  onCharInput(index: 0 | 1 | 2, event: Event, nextInput?: HTMLInputElement | null) {
    const target = event.target as HTMLInputElement;
    const val = target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-1);
    target.value = val;

    if (index === 0) this.char0.set(val);
    if (index === 1) this.char1.set(val);
    if (index === 2) this.char2.set(val);

    this.codeChange.emit(this.code());

    if (val && nextInput) {
      nextInput.focus();
    }
  }

  onCharKeydown(index: 0 | 1 | 2, event: KeyboardEvent, prevInput?: HTMLInputElement | null) {
    if (event.key === 'Backspace') {
      const target = event.target as HTMLInputElement;
      if (!target.value && prevInput) {
        prevInput.focus();
      }
    }
  }

  onNoCodeChange(checked: boolean) {
    this.noCode.set(checked);
    this.noCodeChange.emit(checked);
    if (checked) {
      this.char0.set('');
      this.char1.set('');
      this.char2.set('');
      this.codeChange.emit('');
    }
  }
}

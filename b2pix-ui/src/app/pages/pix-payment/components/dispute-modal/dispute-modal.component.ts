import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dispute-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './dispute-modal.component.html',
  styleUrl: './dispute-modal.component.scss'
})
export class DisputeModalComponent {
  isProcessing = input(false);

  submitted = output<string>();
  cancelled = output<void>();

  reason = signal('');

  get charCount(): number {
    return this.reason().length;
  }

  get isValid(): boolean {
    return this.reason().trim().length > 0 && this.reason().length <= 1000;
  }

  onSubmit(): void {
    if (this.isValid && !this.isProcessing()) {
      this.submitted.emit(this.reason().trim());
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }
}

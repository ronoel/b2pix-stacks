import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-dispute-modal',
  standalone: true,
  imports: [],
  templateUrl: './dispute-modal.component.html',
  styleUrl: './dispute-modal.component.scss'
})
export class DisputeModalComponent {
  isProcessing = input(false);

  submitted = output<void>();
  cancelled = output<void>();

  onSubmit(): void {
    if (!this.isProcessing()) {
      this.submitted.emit();
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

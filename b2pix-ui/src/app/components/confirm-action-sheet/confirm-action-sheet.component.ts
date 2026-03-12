import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-action-sheet',
  standalone: true,
  template: `
    @if (isOpen()) {
      <div class="sheet-overlay" (click)="cancelled.emit()">
        <div class="sheet" (click)="$event.stopPropagation()">
          <div class="sheet-handle"></div>

          <div class="confirm-icon" [class]="'confirm-icon--' + type()">
            @switch (type()) {
              @case ('success') {
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              }
              @case ('danger') {
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              }
              @case ('warning') {
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              }
              @case ('btc') {
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              }
              @default {
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              }
            }
          </div>

          <h3 class="confirm-title">{{ title() }}</h3>
          <p class="confirm-message">{{ message() }}</p>

          <ng-content />

          <div class="confirm-actions">
            <button
              class="btn btn-full"
              [class.btn-primary]="type() === 'primary'"
              [class.btn-btc]="type() === 'btc' || type() === 'warning'"
              [class.btn-success]="type() === 'success'"
              [class.btn-danger]="type() === 'danger'"
              [disabled]="isLoading()"
              (click)="confirmed.emit()">
              @if (isLoading()) {
                <div class="loading-spinner-sm"></div>
              }
              {{ confirmLabel() }}
            </button>
            <button
              class="btn btn-ghost btn-full"
              [disabled]="isLoading()"
              (click)="cancelled.emit()">
              {{ cancelLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './confirm-action-sheet.component.scss'
})
export class ConfirmActionSheetComponent {
  isOpen = input<boolean>(false);
  title = input<string>('');
  message = input<string>('');
  confirmLabel = input<string>('Confirmar');
  cancelLabel = input<string>('Cancelar');
  type = input<'primary' | 'btc' | 'success' | 'danger' | 'warning'>('primary');
  isLoading = input<boolean>(false);

  confirmed = output<void>();
  cancelled = output<void>();
}

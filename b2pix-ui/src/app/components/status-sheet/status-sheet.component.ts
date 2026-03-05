import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-status-sheet',
  standalone: true,
  template: `
    @if (isOpen()) {
      <div class="sheet-overlay" (click)="close.emit()">
        <div class="sheet" [class]="'sheet--' + type()" (click)="$event.stopPropagation()">
          <div class="sheet-handle"></div>
          @if (title()) {
            <h3 class="sheet__title">{{ title() }}</h3>
          }
          @if (subtitle()) {
            <p class="sheet__subtitle">{{ subtitle() }}</p>
          }
          <div class="sheet__body">
            <ng-content />
          </div>
          <div class="sheet__actions">
            <ng-content select="[actions]" />
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .sheet__title {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 16px;
    }

    .sheet__subtitle {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      margin: -12px 0 16px;
    }

    .sheet__body {
      margin-bottom: 20px;
    }

    .sheet__actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .sheet--warning .sheet__title {
      color: var(--warning);
    }

    .sheet--error .sheet__title {
      color: var(--danger);
    }

    .sheet--success .sheet__title {
      color: var(--success);
    }
  `]
})
export class StatusSheetComponent {
  isOpen = input<boolean>(false);
  title = input<string>('');
  subtitle = input<string>('');
  type = input<'confirm' | 'success' | 'error' | 'info' | 'warning'>('confirm');
  close = output<void>();
}

import { Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="page-hdr">
      @if (backRoute() || showBack()) {
        <button class="page-hdr__back" (click)="goBack()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
      }
      <div class="page-hdr__text">
        <h1 class="page-hdr__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="page-hdr__subtitle">{{ subtitle() }}</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-hdr {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 0 24px;
    }

    .page-hdr__back {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: 1px solid var(--border);
      border-radius: var(--r-md);
      background: var(--bg-primary);
      color: var(--text-primary);
      cursor: pointer;
      transition: background 0.15s ease;
      flex-shrink: 0;

      &:hover {
        background: var(--bg-secondary);
      }
    }

    .page-hdr__text {
      flex: 1;
      min-width: 0;
    }

    .page-hdr__title {
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
      line-height: 1.2;
    }

    .page-hdr__subtitle {
      font-size: 14px;
      color: var(--text-muted);
      margin: 4px 0 0;
    }
  `]
})
export class PageHeaderComponent {
  private router = inject(Router);

  title = input.required<string>();
  subtitle = input<string>('');
  backRoute = input<string>('');
  showBack = input(false);
  back = output<void>();

  goBack(): void {
    if (this.showBack()) {
      this.back.emit();
      return;
    }
    const route = this.backRoute();
    if (route) {
      this.router.navigate([route]);
    }
  }
}

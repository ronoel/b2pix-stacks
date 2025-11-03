import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loadingService.getIsLoading()()) {
      <div class="loading-overlay">
        <div class="loading-content">
          <div class="spinner"></div>
          <p>{{ loadingService.getLoadingMessage()() }}</p>
        </div>
      </div>
    }
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    .loading-content {
      background: var(--bg-card);
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      border: 1px solid var(--border-color);
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border-color);
      border-top: 3px solid var(--accent-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    p {
      color: var(--text-secondary);
      margin: 0;
      font-size: 0.9rem;
    }
  `]
})
export class LoadingComponent {
  loadingService = inject(LoadingService);
}

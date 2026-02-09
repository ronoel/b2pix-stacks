import { Component, Input, Output, EventEmitter, signal, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pix-timer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pix-timer" [class.warning]="isWarning()" [class.danger]="isDanger()">
      <div class="timer-icon">
        <i class="bi bi-clock"></i>
      </div>
      <div class="timer-content">
        <div class="timer-label">Tempo restante</div>
        <div class="timer-display">{{ formatTime(timeLeft()) }}</div>
      </div>
    </div>
  `,
  styles: [`
    .pix-timer {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background: #e7f5ff;
      border: 2px solid #0d6efd;
      border-radius: 0.75rem;
      transition: all 0.3s;
    }

    .pix-timer.warning {
      background: #fff3cd;
      border-color: #ffc107;
    }

    .pix-timer.danger {
      background: #f8d7da;
      border-color: #dc3545;
      animation: pulse 1s infinite;
    }

    .timer-icon {
      font-size: 2rem;
      color: #0d6efd;
    }

    .pix-timer.warning .timer-icon {
      color: #ffc107;
    }

    .pix-timer.danger .timer-icon {
      color: #dc3545;
    }

    .timer-content {
      flex: 1;
    }

    .timer-label {
      font-size: 0.875rem;
      color: #6c757d;
      margin-bottom: 0.25rem;
    }

    .timer-display {
      font-size: 1.75rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: #333;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.8;
      }
    }
  `]
})
export class PixTimerComponent implements OnDestroy {
  @Input() set expiresAt(value: string) {
    if (value) {
      this.startTimer(value);
    }
  }

  @Output() expired = new EventEmitter<void>();

  timeLeft = signal(0);
  isWarning = signal(false);
  isDanger = signal(false);

  private intervalId: any;

  constructor() {
    effect(() => {
      const seconds = this.timeLeft();

      if (seconds <= 0) {
        this.cleanup();
        this.expired.emit();
      } else if (seconds <= 60) {
        this.isDanger.set(true);
        this.isWarning.set(false);
      } else if (seconds <= 300) {
        this.isWarning.set(true);
        this.isDanger.set(false);
      } else {
        this.isWarning.set(false);
        this.isDanger.set(false);
      }
    });
  }

  private startTimer(expiresAt: string): void {
    this.cleanup();

    const updateTime = () => {
      const now = new Date();
      const expires = new Date(expiresAt);
      const timeLeftMs = expires.getTime() - now.getTime();
      const timeLeftSeconds = Math.max(0, Math.floor(timeLeftMs / 1000));

      this.timeLeft.set(timeLeftSeconds);
    };

    updateTime();
    this.intervalId = setInterval(updateTime, 1000);
  }

  private cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  formatTime(seconds: number): string {
    if (seconds <= 0) return '00:00';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}

import { Component, Input, signal, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-countdown-timer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="countdown-timer">
      <span class="countdown-text">{{ formatTime(timeLeft()) }}</span>
    </div>
  `,
  styles: [`
    .countdown-timer {
      display: inline-flex;
      align-items: center;
      font-variant-numeric: tabular-nums;
    }

    .countdown-text {
      font-weight: 500;
      color: #6c757d;
    }
  `]
})
export class CountdownTimerComponent implements OnDestroy {
  @Input() set seconds(value: number) {
    this.timeLeft.set(value);
    this.startTimer();
  }

  timeLeft = signal(0);
  private intervalId: any;

  constructor() {
    effect(() => {
      if (this.timeLeft() <= 0 && this.intervalId) {
        clearInterval(this.intervalId);
      }
    });
  }

  private startTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      const current = this.timeLeft();
      if (current > 0) {
        this.timeLeft.set(current - 1);
      }
    }, 1000);
  }

  formatTime(seconds: number): string {
    if (seconds <= 0) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

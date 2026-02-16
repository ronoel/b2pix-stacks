import { Component, Input, Output, EventEmitter, signal, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pix-timer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pix-timer.component.html',
  styleUrl: './pix-timer.component.scss'
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

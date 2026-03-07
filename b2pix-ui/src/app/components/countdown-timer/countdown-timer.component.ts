import { Component, Input, Output, EventEmitter, signal, OnDestroy, effect, ElementRef, viewChild, afterNextRender } from '@angular/core';

@Component({
  selector: 'app-countdown-timer',
  standalone: true,
  imports: [],
  templateUrl: './countdown-timer.component.html',
  styleUrl: './countdown-timer.component.scss'
})
export class CountdownTimerComponent implements OnDestroy {
  @Input() set expiresAt(value: string) {
    if (value) {
      this.startTimer(value);
    }
  }

  @Output() expired = new EventEmitter<void>();
  @Output() warning = new EventEmitter<void>();
  @Output() danger = new EventEmitter<void>();

  timeLeft = signal(0);
  isWarning = signal(false);
  isDanger = signal(false);
  isStuck = signal(false);

  private sentinel = viewChild<ElementRef>('sentinel');
  private intervalId: any;
  private observer: IntersectionObserver | null = null;
  private hasEmittedWarning = false;
  private hasEmittedDanger = false;

  constructor() {
    effect(() => {
      const seconds = this.timeLeft();

      if (seconds <= 0) {
        this.cleanup();
        this.expired.emit();
      } else if (seconds <= 60) {
        this.isDanger.set(true);
        this.isWarning.set(false);
        if (!this.hasEmittedDanger) {
          this.hasEmittedDanger = true;
          this.danger.emit();
        }
      } else if (seconds <= 300) {
        this.isWarning.set(true);
        this.isDanger.set(false);
        if (!this.hasEmittedWarning) {
          this.hasEmittedWarning = true;
          this.warning.emit();
        }
      } else {
        this.isWarning.set(false);
        this.isDanger.set(false);
      }
    });

    afterNextRender(() => {
      const sentinelEl = this.sentinel()?.nativeElement;
      if (sentinelEl) {
        this.observer = new IntersectionObserver(
          ([entry]) => this.isStuck.set(!entry.isIntersecting),
          { threshold: 0 }
        );
        this.observer.observe(sentinelEl);
      }
    });
  }

  private startTimer(expiresAt: string): void {
    this.cleanup();
    this.hasEmittedWarning = false;
    this.hasEmittedDanger = false;

    const updateTime = () => {
      const now = new Date();
      const expires = new Date(expiresAt);
      const timeLeftMs = expires.getTime() - now.getTime();
      this.timeLeft.set(Math.max(0, Math.floor(timeLeftMs / 1000)));
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
    this.observer?.disconnect();
  }
}

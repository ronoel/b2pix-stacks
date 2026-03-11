import { Injectable, inject, signal, isDevMode } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval } from 'rxjs';

const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

@Injectable({
  providedIn: 'root'
})
export class AppUpdateService {
  private swUpdate = inject(SwUpdate);

  readonly updating = signal(false);

  constructor() {
    if (!this.swUpdate.isEnabled) return;

    this.listenForUpdates();
    this.checkOnStartup();
    this.schedulePeriodicChecks();
  }

  private listenForUpdates(): void {
    this.swUpdate.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => this.applyUpdate());
  }

  private async checkOnStartup(): Promise<void> {
    try {
      const hasUpdate = await this.swUpdate.checkForUpdate();
      if (hasUpdate) {
        // VERSION_READY event will fire and applyUpdate() handles it
      }
    } catch (err) {
      if (!isDevMode()) {
        console.error('[AppUpdate] Startup check failed:', err);
      }
    }
  }

  private schedulePeriodicChecks(): void {
    interval(CHECK_INTERVAL_MS).subscribe(async () => {
      try {
        await this.swUpdate.checkForUpdate();
      } catch (err) {
        if (!isDevMode()) {
          console.error('[AppUpdate] Periodic check failed:', err);
        }
      }
    });
  }

  private applyUpdate(): void {
    this.updating.set(true);
    // Brief delay so the overlay renders before reload
    setTimeout(() => document.location.reload(), 500);
  }
}

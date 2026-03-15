import { Injectable, inject, signal } from '@angular/core';
import { PushNotificationApiService } from '../shared/api/push-notification.service';

export type PushState =
  | 'unsupported'     // Browser doesn't support push
  | 'unavailable'     // VAPID key not configured (503)
  | 'prompt'          // Ready to ask for permission
  | 'subscribing'     // Currently subscribing
  | 'subscribed'      // Successfully subscribed
  | 'denied'          // User denied permission
  | 'not-lp'          // User is not an LP (403)
  | 'error';          // Generic error

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private api = inject(PushNotificationApiService);

  readonly state = signal<PushState>('unsupported');
  readonly errorMessage = signal('');

  private vapidPublicKey: string | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private initialized = false;

  /**
   * Initialize push notification support.
   * Call once when entering the LP dashboard.
   * Checks browser support, fetches VAPID key, checks existing subscription.
   */
  async initialize(): Promise<void> {
    // Skip if already initialized with a valid state
    if (this.initialized && this.state() === 'subscribed') {
      // Silently refresh subscription
      await this.refreshSubscription();
      return;
    }

    this.errorMessage.set('');

    // Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      this.state.set('unsupported');
      return;
    }

    // Check if notification permission was denied
    if (Notification.permission === 'denied') {
      this.state.set('denied');
      return;
    }

    // Fetch VAPID key
    try {
      const response = await this.fetchVapidKey();
      this.vapidPublicKey = response.vapid_public_key;
    } catch (error: any) {
      if (error?.status === 503) {
        this.state.set('unavailable');
      } else {
        this.state.set('error');
        this.errorMessage.set('Erro ao verificar suporte a notificações.');
      }
      return;
    }

    // Register push service worker
    try {
      this.swRegistration = await navigator.serviceWorker.register('/push-sw.js', {
        scope: '/push/'
      });
    } catch (error) {
      console.error('Error registering push service worker:', error);
      this.state.set('error');
      this.errorMessage.set('Erro ao registrar serviço de notificações.');
      return;
    }

    // Check existing subscription
    const existingSubscription = await this.swRegistration.pushManager.getSubscription();
    if (existingSubscription) {
      // Already subscribed — silently refresh on backend
      this.initialized = true;
      this.state.set('subscribed');
      await this.refreshSubscription();
      return;
    }

    // Ready to prompt user
    if (Notification.permission === 'granted') {
      // Permission already granted but no subscription — auto-subscribe
      this.initialized = true;
      await this.subscribe();
    } else {
      this.initialized = true;
      this.state.set('prompt');
    }
  }

  /**
   * Request notification permission and subscribe.
   * Call when user clicks "Ativar notificações".
   */
  async subscribe(): Promise<void> {
    if (!this.vapidPublicKey || !this.swRegistration) {
      this.state.set('error');
      this.errorMessage.set('Serviço de notificações não inicializado.');
      return;
    }

    this.state.set('subscribing');
    this.errorMessage.set('');

    try {
      // Request permission if needed
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission === 'denied') {
          this.state.set('denied');
          return;
        }
        if (permission !== 'granted') {
          this.state.set('prompt');
          return;
        }
      }

      // Create push subscription
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      // Extract keys
      const keys = this.extractSubscriptionKeys(subscription);
      if (!keys) {
        this.state.set('error');
        this.errorMessage.set('Erro ao obter chaves de notificação.');
        return;
      }

      // Send to backend
      await this.sendSubscriptionToBackend(subscription.endpoint, keys.p256dh, keys.auth);
      this.state.set('subscribed');
    } catch (error: any) {
      this.handleSubscriptionError(error);
    }
  }

  /**
   * Silently refresh the subscription on the backend (updates last_verified_at).
   */
  private async refreshSubscription(): Promise<void> {
    if (!this.swRegistration) return;

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (!subscription) {
        // Subscription expired — re-subscribe
        this.state.set('prompt');
        return;
      }

      const keys = this.extractSubscriptionKeys(subscription);
      if (!keys) return;

      await this.sendSubscriptionToBackend(subscription.endpoint, keys.p256dh, keys.auth);
    } catch (error) {
      // Silent refresh — don't change state on error
      console.error('Error refreshing push subscription:', error);
    }
  }

  private sendSubscriptionToBackend(endpoint: string, p256dh: string, auth: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.api.subscribe(endpoint, p256dh, auth).subscribe({
        next: () => resolve(),
        error: (error) => reject(error)
      });
    });
  }

  private handleSubscriptionError(error: any): void {
    if (error?.message?.includes('cancelada') || error?.message?.includes('cancelled') || error?.message?.includes('User denied')) {
      this.state.set('prompt');
      return;
    }
    if (error?.status === 403) {
      this.state.set('not-lp');
      this.errorMessage.set('Apenas operadores com credenciais bancárias podem receber notificações.');
      return;
    }
    console.error('Error subscribing to push:', error);
    this.state.set('error');
    this.errorMessage.set('Erro ao ativar notificações. Tente novamente.');
  }

  private fetchVapidKey(): Promise<{ vapid_public_key: string }> {
    return new Promise((resolve, reject) => {
      this.api.getVapidKey().subscribe({
        next: (response) => resolve(response),
        error: (error) => reject(error)
      });
    });
  }

  private extractSubscriptionKeys(subscription: PushSubscription): { p256dh: string; auth: string } | null {
    const p256dhKey = subscription.getKey('p256dh');
    const authKey = subscription.getKey('auth');

    if (!p256dhKey || !authKey) return null;

    return {
      p256dh: this.arrayBufferToBase64Url(p256dhKey),
      auth: this.arrayBufferToBase64Url(authKey)
    };
  }

  private urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer as ArrayBuffer;
  }

  private arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}

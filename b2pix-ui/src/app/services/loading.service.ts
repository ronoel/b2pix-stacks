import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private isLoading = signal(false);
  private loadingMessage = signal('');

  getIsLoading() {
    return this.isLoading.asReadonly();
  }

  getLoadingMessage() {
    return this.loadingMessage.asReadonly();
  }

  show(message: string = 'Carregando...') {
    this.loadingMessage.set(message);
    this.isLoading.set(true);
  }

  hide() {
    this.isLoading.set(false);
    this.loadingMessage.set('');
  }
}

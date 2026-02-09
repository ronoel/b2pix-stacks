import { Injectable, signal } from '@angular/core';
import { Observable, of, delay, map } from 'rxjs';
import { User, PixAccount } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  currentUser = signal<User | null>(null);
  private isLoading = signal(false);
  currentBtcPrice = signal<number>(124500);

  // Mock data
  private mockUsers: User[] = [
    {
      id: '1',
      username: 'johndoe',
      email: 'john@example.com',
      wallet: '0x1234567890abcdef1234567890abcdef12345678',
      status: 'approved',
      hasPixAccount: true,
      createdAt: new Date()
    }
  ];

  private mockPixAccounts: PixAccount[] = [
    {
      id: '1',
      bankName: 'Banco Digital',
      accountNumber: '12345-6',
      pixKey: 'john@example.com',
      verified: true
    }
  ];

  getCurrentUser() {
    return this.currentUser.asReadonly();
  }

  getIsLoading() {
    return this.isLoading.asReadonly();
  }

  connectWallet(walletAddress: string): Observable<User | null> {
    this.isLoading.set(true);

    return of(null).pipe(
      delay(2000),
      map(() => {
        this.isLoading.set(false);
        const user = this.mockUsers.find(u => u.wallet === walletAddress);
        if (user) {
          this.currentUser.set(user);
          return user;
        }
        return null;
      })
    );
  }

  getUserPixAccount(): Observable<PixAccount | null> {
    const currentUser = this.currentUser();
    if (!currentUser) return of(null);
    
    return of(this.mockPixAccounts.find(acc => acc.id === currentUser.id) || null).pipe(delay(500));
  }

  createPixAccount(accountData: Partial<PixAccount>): Observable<boolean> {
    this.isLoading.set(true);
    
    return of(true).pipe(
      delay(2000),
      map(() => {
        this.isLoading.set(false);
        const currentUser = this.currentUser();
        if (currentUser) {
          // Mock: criar conta PIX
          const newPixAccount: PixAccount = {
            id: currentUser.id,
            bankName: accountData.bankName || 'Banco EFI',
            accountNumber: accountData.accountNumber || '12345-6',
            pixKey: accountData.pixKey || currentUser.email,
            verified: true
          };
          this.mockPixAccounts.push(newPixAccount);
          
          // Atualizar usuário
          currentUser.hasPixAccount = true;
          this.currentUser.set({ ...currentUser });
        }
        return true;
      })
    );
  }

  saveBankCredentials(credentials: any): Observable<boolean> {
    this.isLoading.set(true);
    
    return of(true).pipe(
      delay(1500),
      map(() => {
        this.isLoading.set(false);
        // Mock: salvar credenciais bancárias
        return true;
      })
    );
  }

  logout(): void {
    this.currentUser.set(null);
  }
}

export interface User {
  id: string;
  username: string;
  email: string;
  wallet: string;
  status: 'pending' | 'approved' | 'rejected';
  hasPixAccount: boolean;
  createdAt: Date;
}

export interface InviteRequest {
  username: string;
  email: string;
  wallet?: string;
  referralCode?: string;
}

export interface InviteResponse {
  inviteCode: string;
  success: boolean;
}

export interface PixAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  pixKey: string;
  verified: boolean;
}

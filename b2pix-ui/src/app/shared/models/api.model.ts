export interface SignedRequest {
  signature: string;
  publicKey: string;
  payload: string;
}
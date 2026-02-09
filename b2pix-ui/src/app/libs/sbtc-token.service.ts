import { Injectable } from '@angular/core';
import { catchError, from, map, Observable } from 'rxjs';
import { WalletManagerService } from './wallet/wallet-manager.service';
import { environment } from '../../environments/environment';
import {
  AssetString,
  Cl,
  cvToValue,
  FungiblePostCondition,
  PostConditionMode,
} from '@stacks/transactions';
import { ClarityUtil } from './clarity.util';
import { ContractUtil } from './contract.util';

@Injectable({
  providedIn: 'root'
})
export class sBTCTokenService extends ContractUtil {

  private readonly contractTokenName = environment.supportedAsset.sBTC.contractToken;
  private asset: AssetString = `${environment.supportedAsset.sBTC.contractAddress}.${environment.supportedAsset.sBTC.contractName}::${environment.supportedAsset.sBTC.contractToken}`;

  constructor(
    walletManager: WalletManagerService
  ) {
    super(
      environment.supportedAsset.sBTC.contractName,
      environment.supportedAsset.sBTC.contractAddress,
      walletManager
    );
  }

  getAsset(): AssetString {
    return this.asset;
  }

  getContractAddress(): `${string}.${string}` {
    return `${this.contractAddress}.${this.contractName}`;
  }

  getContractTokenName(): string {
    return this.contractTokenName;
  }

  getBalance(): Observable<number> {
    return from(this.callReadOnlyFunction('get-balance', [Cl.principal(this.walletManager.getSTXAddressOrThrow())])).pipe(
      map(ClarityUtil.extractResponse),
      map((response) => Number(cvToValue(response))),
      catchError(this.handleError)
    );
  }

  mint(amount: number, recipient: string): Observable<any> {
          return from(new Promise<any>((resolve, reject) => {

              this.callPublicFunction(
                  'mint',
                  [
                      Cl.uint(amount),
                      Cl.principal(recipient),
                  ],
                  resolve,
                  reject,
                  [],
                  PostConditionMode.Deny
              );
          }));
      }

}

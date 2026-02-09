import { Injectable, inject } from '@angular/core';
import { from, Observable, switchMap, map } from 'rxjs';
import { WalletManagerService } from './wallet/wallet-manager.service';
import { environment } from '../../environments/environment';
import {
    Cl,
    PostConditionMode,
    FungiblePostCondition,
    cvToValue,
} from '@stacks/transactions';
import { ContractUtil } from './contract.util';
import { BoltProtocolService } from './bolt-protocol.service';
import { sBTCTokenService } from './sbtc-token.service';

export interface BoltTransactionResponse {
    // success: boolean;
    txid?: string;
    error?: string | any;
}

@Injectable({
    providedIn: 'root'
})
export class BoltContractSBTCService extends ContractUtil {

    private sbtcTokenService = inject(sBTCTokenService);
    private boltProtocolService = inject(BoltProtocolService);
    // private asset: AssetString = `${environment.boltProtocol.contractAddress}.${environment.supportedAsset.sBTC.contractName}::${environment.supportedAsset.sBTC.contractToken}`;

    constructor(
        walletManager: WalletManagerService
    ) {
        super(
            environment.boltProtocol.contractName,
            environment.boltProtocol.contractAddress,
            walletManager
        );
    }

    getFee(): number {
        return environment.supportedAsset.sBTC.fee;
    }

    getContractAddress(): `${string}.${string}` {
        return `${this.contractAddress}.${this.contractName}`;
    }

    depositFeeFund(amount: number): Observable<BoltTransactionResponse> {

        return from(new Promise<any>((resolve, reject) => {
            const ftPostCondition: FungiblePostCondition = {
                type: 'ft-postcondition',
                address: this.walletManager.getSTXAddressOrThrow(),
                condition: 'eq',
                amount: amount + this.getFee(),
                asset: this.sbtcTokenService.getAsset()
            };

            this.callSponsoredFunction(
                'deposit-fee-fund',
                [
                    Cl.uint(amount),
                    Cl.uint(this.getFee())
                ],
                (tx: any) => {
                    this.boltProtocolService.sendTransaction(tx).subscribe({
                        next: (txid: string) => resolve(txid),
                        error: reject
                    })
                },
                reject,
                [ftPostCondition],
                PostConditionMode.Deny
            );
        }));
    }

    deposit(amount: number, recipient: string): Observable<any> {
        return from(new Promise<any>((resolve, reject) => {
            const ftPostCondition: FungiblePostCondition = {
                type: 'ft-postcondition',
                address: this.walletManager.getSTXAddressOrThrow(),
                condition: 'eq',
                amount: amount,
                asset: this.sbtcTokenService.getAsset()
            };

            this.callPublicFunction(
                'deposit',
                [
                    Cl.uint(amount),
                    Cl.principal(recipient),
                    Cl.none()
                ],
                resolve,
                reject,
                [ftPostCondition],
                PostConditionMode.Deny
            );
        }));
    }

    depositSponsored(amount: number, recipient: string, fee: bigint): Observable<any> {
        return from(new Promise<any>((resolve, reject) => {
            const ftPostCondition: FungiblePostCondition = {
                type: 'ft-postcondition',
                address: this.walletManager.getSTXAddressOrThrow(),
                condition: 'eq',
                amount: amount,
                asset: this.sbtcTokenService.getAsset()
            };

            this.callSponsoredFunction(
                'deposit',
                [
                    Cl.uint(amount),
                    Cl.principal(recipient),
                    Cl.none()
                ],
                // resolve,
                (tx: any) => {
                    this.boltProtocolService.sponsorTransaction(tx).subscribe({
                        next: (txid: string) => resolve(txid),
                        error: reject
                    })
                },
                reject,
                [ftPostCondition],
                PostConditionMode.Deny
            );
        }));
    }

    transferStacksToBolt(amount: number, recipient: string, memo: string = ''): Observable<string> {
        const memoParam = memo ? Cl.some(Cl.bufferFromAscii(memo)) : Cl.none();

        return from(new Promise<any>((resolve, reject) => {
            const ftPostCondition: FungiblePostCondition = {
                type: 'ft-postcondition',
                address: this.walletManager.getSTXAddressOrThrow(),
                condition: 'eq',
                amount: BigInt(amount + this.getFee()),
                asset: this.sbtcTokenService.getAsset()
            };

            this.callSponsoredFunction(
                'transfer-stacks-to-bolt',
                [
                    Cl.uint(amount),
                    Cl.principal(recipient),
                    memoParam,
                    Cl.uint(this.getFee())
                ],
                (tx: any) => {
                    
                    resolve(tx);
                    // this.boltProtocolService.sendTransaction(tx).subscribe({
                    //     next: (txid: string) => resolve(txid),
                    //     error: reject
                    // })
                },
                reject,
                [ftPostCondition],
                PostConditionMode.Deny
            );
        }));
    }

    public transferBoltToBolt(
        amount: number,
        recipientAddress: string,
        memo: string = '' // Add optional memo parameter with default empty string
    ): Observable<BoltTransactionResponse> {
        const memoParam = memo ? Cl.some(Cl.bufferFromAscii(memo)) : Cl.none();

        return from(new Promise<any>((resolve, reject) => {

            this.callSponsoredFunction(
                'transfer-bolt-to-bolt',
                [
                    Cl.uint(amount),
                    Cl.principal(recipientAddress),
                    memoParam,
                    Cl.uint(this.getFee())
                ],
                (tx: any) => this.boltProtocolService.sendTransaction(tx).subscribe({
                    next: (txid: string) => resolve(txid),
                    error: reject
                }),
                // (tx: any) => 
                //     {
                //         console.log(tx);
                //         resolve(tx);
                //     },
                reject,
                [],
                PostConditionMode.Deny
            );
        }));
    }

    transferBoltToStacks(amount: number, recipient: string, memo: string = ''): Observable<string> {
        const memoParam = memo ? Cl.some(Cl.bufferFromAscii(memo)) : Cl.none();

        return from(new Promise<any>((resolve, reject) => {
            const ftPostCondition: FungiblePostCondition = {
                type: 'ft-postcondition',
                address: this.getContractAddress(),
                condition: 'eq',
                amount: amount,
                asset: this.sbtcTokenService.getAsset()
            };

            this.callSponsoredFunction(
                'transfer-bolt-to-stacks',
                [
                    Cl.uint(amount),
                    Cl.principal(recipient),
                    memoParam,
                    Cl.uint(this.getFee())
                ],
                (tx: any) => resolve(tx),
                // (tx: any) => this.boltProtocolService.sendTransaction(tx).subscribe({
                //     next: (txid: string) => resolve(txid),
                //     error: reject
                // }),
                reject,
                [ftPostCondition],
                PostConditionMode.Deny
            );
        }));
    }

    transferStacksToStacks(amount: number, recipient: string, memo: string = ''): Observable<BoltTransactionResponse> {
        const memoParam = memo ? Cl.some(Cl.bufferFromAscii(memo)) : Cl.none();

        return from(new Promise<any>((resolve, reject) => {
            const ftPostCondition: FungiblePostCondition = {
                type: 'ft-postcondition',
                address: this.walletManager.getSTXAddressOrThrow(),
                condition: 'eq',
                amount: amount + this.getFee(),
                asset: this.sbtcTokenService.getAsset()
            };

            this.callSponsoredFunction(
                'transfer-stacks-to-stacks',
                [
                    Cl.uint(amount),
                    Cl.principal(recipient),
                    memoParam,
                    Cl.uint(this.getFee())
                ],
                (tx: string) => this.boltProtocolService.sendTransaction(tx).subscribe({
                    next: (txid: string) => resolve(txid),
                    error: reject
                }),
                reject,
                [ftPostCondition],
                PostConditionMode.Deny
            );
        }));
    }

    requestWithdrawal(amount: number): Observable<any> {
        return from(new Promise<any>((resolve, reject) => {
            this.callPublicFunction(
                'request-withdrawal',
                [
                    Cl.uint(amount)
                ],
                resolve,
                reject,
                [],
                PostConditionMode.Deny
            );
        }));
    }

    claimWithdrawal(): Observable<any> {
        return this.getWalletData(this.walletManager.getSTXAddressOrThrow()).pipe(
            switchMap((walletData) => {
                const withdrawAmount = walletData.withdrawRequestedAmount;
                if (withdrawAmount <= 0) {
                    throw new Error('No withdrawal amount available');
                }

                const ftPostCondition: FungiblePostCondition = {
                    type: 'ft-postcondition',
                    address: this.getContractAddress(),
                    condition: 'eq',
                    amount: withdrawAmount,
                    asset: this.sbtcTokenService.getAsset()
                };

                return from(new Promise<any>((resolve, reject) => {
                    this.callPublicFunction(
                        'claim-withdrawal',
                        [],
                        resolve,
                        reject,
                        [ftPostCondition],
                        PostConditionMode.Deny
                    );
                }));
            })
        );
    }

    getWalletData(address: string): Observable<any> {
        return from(this.callReadOnlyFunction(
            'get-wallet-data',
            [
                Cl.principal(address)
            ]
        )).pipe(
            map((result: any) => {
                const data = cvToValue(result);
                if (result.value) {
                    return {
                        balance: cvToValue(data['balance']),
                        withdrawRequestedAmount: cvToValue(data['withdraw-requested-amount']),
                        withdrawRequestedBlock: cvToValue(data['withdraw-requested-block'])
                    };
                }
                return null;
            })
        );
    }

}

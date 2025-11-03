import { Observable, throwError } from 'rxjs';
import { WalletManagerService } from './wallet/wallet-manager.service';
import {
  PostConditionMode,
  fetchCallReadOnlyFunction,
  ReadOnlyFunctionOptions,
  ClarityValue,
  PostCondition,
} from '@stacks/transactions';
import { createApiKeyMiddleware, createFetchFn } from "@stacks/common";
import { StacksNetworkName } from '@stacks/network';
import { environment } from '../../environments/environment';

export abstract class ContractUtil {

  constructor(
    protected contractName: string,
    protected contractAddress: string,
    protected walletManager: WalletManagerService
  ) {

  }

  protected callReadOnlyFunction(functionName: string, functionArgs: ClarityValue[]): Promise<ClarityValue> {
    const options = this.createGenericReadOnlyFunctionOptions(functionName, functionArgs);
    return fetchCallReadOnlyFunction(options);
  }

  protected async callPublicFunction(
    functionName: string,
    functionArgs: ClarityValue[],
    resolve: Function,
    reject: Function,
    postConditions?: (string | PostCondition)[],
    postConditionMode: PostConditionMode = PostConditionMode.Deny
  ): Promise<void> {

    try {
      // Map PostConditionMode enum to string expected by the new API
      const postConditionModeString = postConditionMode === PostConditionMode.Allow ? 'allow' : 'deny';

      const response = await this.walletManager.callContract({
        contract: `${this.contractAddress}.${this.contractName}`,
        functionName,
        functionArgs,
        network: environment.network as StacksNetworkName,
        postConditions,
        postConditionMode: postConditionModeString
      });

      resolve(response.txid);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (error) {
      reject(error);
    }
  }

  protected async callSponsoredFunction(
    functionName: string,
    functionArgs: ClarityValue[],
    resolve: Function,
    reject: Function,
    postConditions?: (string | PostCondition)[],
    postConditionMode: PostConditionMode = PostConditionMode.Deny
  ): Promise<void> {

    // Note: In v8, sponsored transactions may need different handling
    // This is a simplified implementation - you may need to adjust based on your needs
    try {
      // Map PostConditionMode enum to string expected by the new API
      const postConditionModeString = postConditionMode === PostConditionMode.Allow ? 'allow' : 'deny';

      const response = await this.walletManager.callContract({
        contract: `${this.contractAddress}.${this.contractName}`,
        functionName,
        functionArgs,
        network: environment.network as StacksNetworkName,
        postConditions,
        postConditionMode: postConditionModeString,
        sponsored: true // If the wallet supports this parameter
      });

      resolve(response.transaction);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (error) {
      reject(error);
    }
  }

  protected createGenericReadOnlyFunctionOptions(functionName: string, functionArgs: ClarityValue[]): ReadOnlyFunctionOptions {

    const apiMiddleware = createApiKeyMiddleware({
      apiKey: environment.hiroApiKey,
    });


    const customFetchFn = createFetchFn(apiMiddleware);
    const senderAddress = this.walletManager.getSTXAddress() || this.contractAddress;

    return {
      contractAddress: this.contractAddress,
      contractName: this.contractName,
      // ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.hello-world
      // contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      // contractName: 'hello-world',
      functionName: functionName,
      functionArgs: functionArgs,
      network: environment.network as StacksNetworkName, // This is now properly typed
      // client: { baseUrl: environment.blockchainAPIUrl }, // optional, defaults inferred from network
      // client: { baseUrl: 'https://api.platform.hiro.so/v1/ext/d1087667a742b16e54ea8a64f12dbc28/stacks-blockchain-api' }, // optional, defaults inferred from network
      senderAddress: senderAddress,
      client: {
        baseUrl: environment.blockchainAPIUrl, // This is now properly typed
        fetch: customFetchFn, // Use the custom fetch function with API key middleware
      }
    };
  }
  // { contractName, contractAddress, functionName, functionArgs, senderAddress, network, client: _client, 

  protected handleError(error: any): Observable<never> {
    console.error('Error:', error);
    return throwError(() => new Error(`An error occurred: ${error.message}`));
  }
}

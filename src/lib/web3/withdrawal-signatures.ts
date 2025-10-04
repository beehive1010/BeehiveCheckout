// User Wallet Signature-Based Withdrawal Request System
// Implements secure signature verification for withdrawal requests using EIP-712

import { createThirdwebClient } from 'thirdweb';
import { verifyEIP712Signature } from 'thirdweb/utils';
import { getChainConfig } from './multi-chain-config';

// EIP-712 domain for withdrawal signatures
export const WITHDRAWAL_DOMAIN = {
  name: 'Beehive Platform Withdrawals',
  version: '1',
  verifyingContract: '0x0000000000000000000000000000000000000000', // Placeholder
} as const;

// EIP-712 types for withdrawal requests
export const WITHDRAWAL_TYPES = {
  WithdrawalRequest: [
    { name: 'userWallet', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'targetChainId', type: 'uint256' },
    { name: 'tokenAddress', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
} as const;

export interface WithdrawalSignatureRequest {
  userWallet: string;
  amount: string; // in USDT (human readable)
  targetChainId: number;
  tokenAddress: string;
  nonce?: number;
  deadline?: number; // Unix timestamp
}

export interface WithdrawalSignature {
  signature: string;
  message: WithdrawalSignatureRequest;
  messageHash: string;
  domain: typeof WITHDRAWAL_DOMAIN;
  types: typeof WITHDRAWAL_TYPES;
}

export interface SignedWithdrawalRequest extends WithdrawalSignatureRequest {
  signature: string;
  signedAt: number;
  validUntil: number;
}

class WithdrawalSignatureManager {
  private client = createThirdwebClient({
    clientId: process.env.VITE_THIRDWEB_CLIENT_ID!
  });

  /**
   * Generate EIP-712 message for withdrawal request
   */
  generateWithdrawalMessage(request: WithdrawalSignatureRequest): {
    domain: typeof WITHDRAWAL_DOMAIN;
    types: typeof WITHDRAWAL_TYPES;
    message: {
      userWallet: string;
      amount: string;
      targetChainId: string;
      tokenAddress: string;
      nonce: string;
      deadline: string;
    };
  } {
    const chainConfig = getChainConfig(request.targetChainId);
    if (!chainConfig) {
      throw new Error(`Unsupported target chain: ${request.targetChainId}`);
    }

    // Convert amount to wei (assuming 6 decimals for USDT)
    const amountWei = (parseFloat(request.amount) * 1000000).toString();
    
    // Generate nonce if not provided
    const nonce = request.nonce || Date.now();
    
    // Set deadline (default: 1 hour from now)
    const deadline = request.deadline || (Math.floor(Date.now() / 1000) + 3600);

    const domain = {
      ...WITHDRAWAL_DOMAIN,
      chainId: request.targetChainId
    };

    const message = {
      userWallet: request.userWallet,
      amount: amountWei,
      targetChainId: request.targetChainId.toString(),
      tokenAddress: request.tokenAddress,
      nonce: nonce.toString(),
      deadline: deadline.toString()
    };

    return {
      domain,
      types: WITHDRAWAL_TYPES,
      message
    };
  }

  /**
   * Request user to sign withdrawal using wallet
   */
  async requestWithdrawalSignature(
    request: WithdrawalSignatureRequest,
    wallet: any
  ): Promise<{
    success: boolean;
    signature?: WithdrawalSignature;
    error?: string;
  }> {
    try {
      const { domain, types, message } = this.generateWithdrawalMessage(request);

      // Request signature from user's wallet
      const signature = await wallet.signTypedData({
        domain,
        types,
        message,
        primaryType: 'WithdrawalRequest'
      });

      if (!signature) {
        return {
          success: false,
          error: 'User rejected signature request'
        };
      }

      return {
        success: true,
        signature: {
          signature,
          message: request,
          messageHash: '', // This would be calculated
          domain,
          types
        }
      };

    } catch (error) {
      console.error('Withdrawal signature request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Signature request failed'
      };
    }
  }

  /**
   * Verify withdrawal signature on server side
   */
  async verifyWithdrawalSignature(
    signedRequest: SignedWithdrawalRequest
  ): Promise<{
    isValid: boolean;
    error?: string;
    recoveredAddress?: string;
  }> {
    try {
      const { domain, types, message } = this.generateWithdrawalMessage(signedRequest);

      // Verify the signature
      const isValid = await verifyEIP712Signature({
        message: message,
        signature: signedRequest.signature,
        address: signedRequest.userWallet,
        domain,
        types,
        primaryType: 'WithdrawalRequest'
      });

      if (!isValid) {
        return {
          isValid: false,
          error: 'Invalid signature'
        };
      }

      // Check if signature is still valid (not expired)
      const now = Math.floor(Date.now() / 1000);
      const deadline = signedRequest.deadline || signedRequest.validUntil;
      
      if (deadline && now > deadline) {
        return {
          isValid: false,
          error: 'Signature has expired'
        };
      }

      return {
        isValid: true,
        recoveredAddress: signedRequest.userWallet
      };

    } catch (error) {
      console.error('Signature verification failed:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Generate human-readable signature message for display
   */
  generateHumanReadableMessage(request: WithdrawalSignatureRequest): string {
    const chainConfig = getChainConfig(request.targetChainId);
    const chainName = chainConfig?.name || `Chain ${request.targetChainId}`;
    
    const deadline = request.deadline 
      ? new Date(request.deadline * 1000).toLocaleString()
      : 'No expiration';

    return `🔐 WITHDRAWAL AUTHORIZATION REQUEST

📤 Withdraw: ${request.amount} USDT
🌐 To Chain: ${chainName} (${request.targetChainId})
💰 Token: ${request.tokenAddress}
👤 From Wallet: ${request.userWallet}
🔢 Nonce: ${request.nonce || 'Auto-generated'}
⏰ Valid Until: ${deadline}

⚠️  IMPORTANT SECURITY NOTICE:
• Only sign this message if you initiated this withdrawal
• Verify the amount and destination chain are correct
• This signature authorizes a withdrawal from the Beehive Platform
• Your funds will be sent to your wallet address on the selected chain

🚨 Never sign withdrawal requests from untrusted sources!`;
  }

  /**
   * Create withdrawal request with signature validation
   */
  async createSignedWithdrawalRequest(
    request: WithdrawalSignatureRequest,
    wallet: any
  ): Promise<{
    success: boolean;
    signedRequest?: SignedWithdrawalRequest;
    error?: string;
  }> {
    try {
      // Validate request parameters
      const validation = this.validateWithdrawalRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Request signature from user
      const signatureResult = await this.requestWithdrawalSignature(request, wallet);
      if (!signatureResult.success || !signatureResult.signature) {
        return {
          success: false,
          error: signatureResult.error || 'Failed to get signature'
        };
      }

      // Create signed request
      const signedRequest: SignedWithdrawalRequest = {
        ...request,
        signature: signatureResult.signature.signature,
        signedAt: Math.floor(Date.now() / 1000),
        validUntil: request.deadline || (Math.floor(Date.now() / 1000) + 3600)
      };

      return {
        success: true,
        signedRequest
      };

    } catch (error) {
      console.error('Create signed withdrawal request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create signed request'
      };
    }
  }

  /**
   * Validate withdrawal request parameters
   */
  validateWithdrawalRequest(request: WithdrawalSignatureRequest): {
    isValid: boolean;
    error?: string;
  } {
    // Check required fields
    if (!request.userWallet || !request.amount || !request.targetChainId || !request.tokenAddress) {
      return { isValid: false, error: 'Missing required fields' };
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(request.userWallet)) {
      return { isValid: false, error: 'Invalid wallet address format' };
    }

    // Validate token address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(request.tokenAddress)) {
      return { isValid: false, error: 'Invalid token address format' };
    }

    // Validate amount
    const amount = parseFloat(request.amount);
    if (isNaN(amount) || amount <= 0) {
      return { isValid: false, error: 'Invalid amount' };
    }

    if (amount < 1) {
      return { isValid: false, error: 'Minimum withdrawal is 1 USDT' };
    }

    if (amount > 10000) {
      return { isValid: false, error: 'Maximum withdrawal is 10,000 USDT per transaction' };
    }

    // Validate chain
    const chainConfig = getChainConfig(request.targetChainId);
    if (!chainConfig) {
      return { isValid: false, error: `Unsupported chain: ${request.targetChainId}` };
    }

    // Validate deadline if provided
    if (request.deadline) {
      const now = Math.floor(Date.now() / 1000);
      if (request.deadline <= now) {
        return { isValid: false, error: 'Deadline must be in the future' };
      }
      
      const maxDeadline = now + (24 * 60 * 60); // 24 hours max
      if (request.deadline > maxDeadline) {
        return { isValid: false, error: 'Deadline cannot be more than 24 hours in the future' };
      }
    }

    return { isValid: true };
  }

  /**
   * Get signature status for UI display
   */
  getSignatureStatus(signedRequest: SignedWithdrawalRequest): {
    status: 'valid' | 'expired' | 'invalid';
    message: string;
    timeRemaining?: number;
  } {
    const now = Math.floor(Date.now() / 1000);
    
    if (!signedRequest.signature || signedRequest.signature.length < 10) {
      return {
        status: 'invalid',
        message: 'Invalid or missing signature'
      };
    }

    if (signedRequest.validUntil && now > signedRequest.validUntil) {
      return {
        status: 'expired',
        message: 'Signature has expired'
      };
    }

    const timeRemaining = signedRequest.validUntil ? signedRequest.validUntil - now : 0;

    return {
      status: 'valid',
      message: 'Signature is valid and ready for processing',
      timeRemaining
    };
  }

  /**
   * Format time remaining for display
   */
  formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return 'Expired';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s remaining`;
    } else {
      return `${remainingSeconds}s remaining`;
    }
  }
}

// Export singleton instance
export const withdrawalSignatureManager = new WithdrawalSignatureManager();

// Export types for use in other modules
export type {
  WithdrawalSignatureRequest,
  WithdrawalSignature,
  SignedWithdrawalRequest
};
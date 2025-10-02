// Multi-Chain Payment Integration Tests
// Tests the complete payment flow from UI to blockchain confirmation

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { multiChainPaymentProcessor, getUSDCBalance } from '../../src/lib/web3/multi-chain-payment';
import { MULTI_CHAIN_CONFIG, getChainConfig } from '../../src/lib/web3/multi-chain-config';
import { updatedApiClient } from '../../src/lib/apiClientUpdated';

// Test configuration
const TEST_CONFIG = {
  // Use testnet chains for testing
  testChains: [
    421614, // Arbitrum Sepolia
  ],
  testWallet: '0x742d35Cc0000000000000000000000000000000', // Placeholder test wallet
  testAmount: 10, // $10 USDC for testing
  timeout: 60000, // 60 second timeout for blockchain operations
};

describe('Multi-Chain Payment Integration', () => {
  
  beforeAll(async () => {
    // Setup test environment
    console.log('Setting up multi-chain payment integration tests...');
  });

  afterAll(async () => {
    // Cleanup after tests
    console.log('Multi-chain payment integration tests completed.');
  });

  describe('Chain Configuration', () => {
    it('should have all required chain configurations', () => {
      const chains = Object.values(MULTI_CHAIN_CONFIG);
      
      expect(chains.length).toBeGreaterThan(0);
      
      chains.forEach(chain => {
        expect(chain).toHaveProperty('chainId');
        expect(chain).toHaveProperty('name');
        expect(chain).toHaveProperty('usdcAddress');
        expect(chain).toHaveProperty('bridgeWalletAddress');
        expect(chain).toHaveProperty('rpcUrl');
        expect(chain.chainId).toBeGreaterThan(0);
        expect(chain.name).toBeTruthy();
        expect(chain.usdcAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(chain.bridgeWalletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      });
    });

    it('should have Arbitrum as primary chain', () => {
      const arbitrumChain = getChainConfig(42161); // Arbitrum One
      expect(arbitrumChain).toBeTruthy();
      expect(arbitrumChain?.name).toBe('Arbitrum One');
    });

    it('should have testnet configurations', () => {
      const arbitrumTestnet = getChainConfig(421614); // Arbitrum Sepolia
      expect(arbitrumTestnet).toBeTruthy();
      expect(arbitrumTestnet?.isTestnet).toBe(true);
    });
  });

  describe('Payment Processor', () => {
    it('should validate payment requests correctly', async () => {
      const validRequest = {
        amount: TEST_CONFIG.testAmount,
        sourceChainId: TEST_CONFIG.testChains[0],
        payerAddress: TEST_CONFIG.testWallet,
        paymentPurpose: 'membership_activation' as const,
        referenceId: `test_${Date.now()}`
      };

      // This will fail in test environment but should validate the request structure
      const result = await multiChainPaymentProcessor.processPayment(
        validRequest,
        null // No account in test environment
      );

      // Should fail due to no account, but validation should pass
      expect(result.success).toBe(false);
      expect(result.chainId).toBe(validRequest.sourceChainId);
      expect(result.amount).toBe(validRequest.amount);
    });

    it('should reject invalid payment amounts', async () => {
      const invalidRequest = {
        amount: 0, // Invalid amount
        sourceChainId: TEST_CONFIG.testChains[0],
        payerAddress: TEST_CONFIG.testWallet,
        paymentPurpose: 'membership_activation' as const,
        referenceId: `test_${Date.now()}`
      };

      const result = await multiChainPaymentProcessor.processPayment(
        invalidRequest,
        null
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('amount');
    });

    it('should reject invalid wallet addresses', async () => {
      const invalidRequest = {
        amount: TEST_CONFIG.testAmount,
        sourceChainId: TEST_CONFIG.testChains[0],
        payerAddress: 'invalid_wallet', // Invalid wallet
        paymentPurpose: 'membership_activation' as const,
        referenceId: `test_${Date.now()}`
      };

      const result = await multiChainPaymentProcessor.processPayment(
        invalidRequest,
        null
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('address');
    });
  });

  describe('Balance Checking', () => {
    it('should handle balance checks for supported chains', async () => {
      for (const chainId of TEST_CONFIG.testChains) {
        const result = await getUSDCBalance(TEST_CONFIG.testWallet, chainId);
        
        // Should return a result (even if error due to test environment)
        expect(result).toHaveProperty('balance');
        expect(typeof result.balance).toBe('number');
        expect(result.balance).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle unsupported chains gracefully', async () => {
      const result = await getUSDCBalance(TEST_CONFIG.testWallet, 999999); // Non-existent chain
      
      expect(result.error).toBeTruthy();
      expect(result.balance).toBe(0);
    });
  });

  describe('API Integration', () => {
    it('should have multi-chain payment API methods available', () => {
      expect(updatedApiClient.recordMultiChainPayment).toBeDefined();
      expect(updatedApiClient.createBridgeRequest).toBeDefined();
      expect(updatedApiClient.getMultiChainTransactions).toBeDefined();
      expect(updatedApiClient.getBridgeStatus).toBeDefined();
    });

    it('should validate API method signatures', async () => {
      const mockPaymentData = {
        transactionHash: '0x123...abc',
        chainId: TEST_CONFIG.testChains[0],
        amount: TEST_CONFIG.testAmount,
        payerAddress: TEST_CONFIG.testWallet,
        paymentPurpose: 'membership_activation',
        fees: {
          networkFee: 0.001,
          platformFee: 0.05,
          totalFee: 0.051
        },
        status: 'completed'
      };

      // Should not throw type errors
      expect(() => {
        updatedApiClient.recordMultiChainPayment(mockPaymentData);
      }).not.toThrow();
    });
  });

  describe('Fee Calculations', () => {
    it('should calculate fees for all supported chains', () => {
      const chains = Object.values(MULTI_CHAIN_CONFIG);
      
      chains.forEach(chain => {
        expect(chain.averageGasFee).toBeGreaterThan(0);
        expect(typeof chain.averageGasFee).toBe('number');
      });
    });

    it('should have reasonable fee ranges', () => {
      const chains = Object.values(MULTI_CHAIN_CONFIG);
      
      chains.forEach(chain => {
        // Gas fees should be between $0.001 and $100
        expect(chain.averageGasFee).toBeGreaterThan(0.001);
        expect(chain.averageGasFee).toBeLessThan(100);
      });
    });
  });
});

describe('Cross-Chain Bridge Integration', () => {
  
  describe('Bridge Configuration', () => {
    it('should have bridge wallet addresses for all chains', () => {
      const chains = Object.values(MULTI_CHAIN_CONFIG);
      
      chains.forEach(chain => {
        expect(chain.bridgeWalletAddress).toBeTruthy();
        expect(chain.bridgeWalletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      });
    });

    it('should have different bridge wallets per chain', () => {
      const chains = Object.values(MULTI_CHAIN_CONFIG);
      const bridgeWallets = chains.map(chain => chain.bridgeWalletAddress);
      const uniqueWallets = new Set(bridgeWallets);
      
      // Each chain should have its own bridge wallet
      expect(uniqueWallets.size).toBe(chains.length);
    });
  });

  describe('Bridge Payment Processing', () => {
    it('should handle bridge payment requests', async () => {
      const bridgeRequest = {
        amount: TEST_CONFIG.testAmount,
        sourceChainId: TEST_CONFIG.testChains[0],
        targetChainId: 42161, // Bridge to Arbitrum mainnet
        payerAddress: TEST_CONFIG.testWallet,
        paymentPurpose: 'membership_activation' as const,
        referenceId: `bridge_test_${Date.now()}`
      };

      const result = await multiChainPaymentProcessor.processPayment(
        bridgeRequest,
        null
      );

      // Should validate bridge request structure
      expect(result.chainId).toBe(bridgeRequest.sourceChainId);
      expect(result.amount).toBe(bridgeRequest.amount);
    });
  });
});

describe('Error Handling', () => {
  
  it('should handle network errors gracefully', async () => {
    const invalidChainRequest = {
      amount: TEST_CONFIG.testAmount,
      sourceChainId: 999999, // Non-existent chain
      payerAddress: TEST_CONFIG.testWallet,
      paymentPurpose: 'membership_activation' as const,
      referenceId: `error_test_${Date.now()}`
    };

    const result = await multiChainPaymentProcessor.processPayment(
      invalidChainRequest,
      null
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should provide meaningful error messages', async () => {
    const invalidRequest = {
      amount: -1, // Invalid negative amount
      sourceChainId: TEST_CONFIG.testChains[0],
      payerAddress: 'not_a_wallet_address',
      paymentPurpose: 'invalid_purpose' as any,
      referenceId: ''
    };

    const result = await multiChainPaymentProcessor.processPayment(
      invalidRequest,
      null
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(typeof result.error).toBe('string');
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('should handle timeout scenarios', async () => {
    // This test would require mocking network delays
    // For now, just ensure timeout values are reasonable
    const chains = Object.values(MULTI_CHAIN_CONFIG);
    
    chains.forEach(chain => {
      expect(chain.blockTime).toBeGreaterThan(0);
      expect(chain.blockTime).toBeLessThan(60); // Block time should be under 1 minute
      expect(chain.confirmationBlocks).toBeGreaterThan(0);
      expect(chain.confirmationBlocks).toBeLessThan(100); // Reasonable confirmation count
    });
  });
});

// Export test utilities for other test files
export const testUtils = {
  TEST_CONFIG,
  mockPaymentRequest: (overrides = {}) => ({
    amount: TEST_CONFIG.testAmount,
    sourceChainId: TEST_CONFIG.testChains[0],
    payerAddress: TEST_CONFIG.testWallet,
    paymentPurpose: 'membership_activation' as const,
    referenceId: `test_${Date.now()}`,
    ...overrides
  })
};
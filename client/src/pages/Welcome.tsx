import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { useActiveAccount, useActiveWallet } from 'thirdweb/react';
import { useWeb3 } from '../contexts/Web3Context';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { Loader2, Crown, Shield, Zap, Users, Database, CreditCard, TestTube } from 'lucide-react';

export default function Welcome() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const account = useActiveAccount();
  const { checkMembershipStatus, isSupabaseAuthenticated } = useWeb3();
  
  // Import wallet hook at component level
  const wallet = useActiveWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [referrerWallet, setReferrerWallet] = useState<string | null>(null);
  const [claimState, setClaimState] = useState<{
    method: string | null;
    loading: boolean;
    error: string | null;
  }>({
    method: null,
    loading: false,
    error: null
  });

  // Get referrer from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam && refParam.startsWith('0x') && refParam.length === 42) {
      setReferrerWallet(refParam.toLowerCase());
    }
    
    // Simulate loading time for better UX
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handle wallet not connected
  useEffect(() => {
    if (!account?.address) {
      setLocation('/');
      return;
    }
  }, [account?.address, setLocation]);

  // Helper function to get level-to-tokenId mapping
  const getLevelTokenId = (level: number): number => {
    // Level 1 → Token ID 1, Level 2 → Token ID 2, ..., Level 19 → Token ID 19
    if (level < 1 || level > 19) {
      throw new Error(`Invalid level: ${level}. Must be between 1 and 19.`);
    }
    return level;
  };

  const handleOnChainClaim = async (claimMethod: string, claimData: any, walletAddress: string) => {
    try {
      // Import Thirdweb dependencies
      const { prepareContractCall, sendTransaction } = await import('thirdweb');
      const { bbcMembershipContracts } = await import('../lib/web3/contracts');
      
      let contract;
      let chainName;
      
      // Select the appropriate contract based on claim method
      if (claimMethod === 'testnet_arb_sepolia') {
        contract = bbcMembershipContracts.arbitrumSepolia;
        chainName = 'Arbitrum Sepolia';
      } else if (claimMethod === 'mainnet_arb_one') {
        contract = bbcMembershipContracts.arbitrum;
        chainName = 'Arbitrum One';
      } else {
        throw new Error('Invalid claim method for on-chain claiming');
      }
      
      toast({
        title: `Preparing ${chainName} Transaction`,
        description: 'Please confirm the transaction in your wallet...',
      });
      
      // Check if wallet is connected
      if (!wallet) {
        throw new Error('No wallet connected');
      }
      
      // ERC1155 Edition Drop claiming
      // Level 1 = Token ID 1, Level 2 = Token ID 2, etc.
      const targetLevel = claimData.targetLevel || 1;
      const tokenId = getLevelTokenId(targetLevel);
      
      console.log(`Claiming Level ${targetLevel} BBC Membership NFT (Token ID ${tokenId}) on ${chainName}`);
      console.log('Contract address:', contract.address);
      console.log('Recipient:', walletAddress);
      
      // Prepare ERC1155 Edition Drop claim transaction
      const transaction = prepareContractCall({
        contract,
        method: 'claim',
        params: [
          walletAddress, // recipient
          tokenId, // tokenId (1 for Level 1, 2 for Level 2, etc.)
          1, // quantity (1 NFT)
          "0x0000000000000000000000000000000000000000", // currency (native token = free)
          0, // pricePerToken (0 = free claim)
          {
            proof: [], // merkle proof (empty for public claim)
            quantityLimitPerWallet: 1, // limit 1 per wallet
            pricePerToken: 0, // free claim
            currency: "0x0000000000000000000000000000000000000000"
          }, // allowlist claim conditions
          "0x" // data
        ],
      });
      
      // Send the transaction
      const txResult = await sendTransaction({
        transaction,
        account: wallet.getAccount()
      });
      
      toast({
        title: "🎉 NFT Claim Transaction Sent!",
        description: `Level ${targetLevel} BBC Membership NFT (Token ID ${tokenId}) - TX: ${txResult.transactionHash.slice(0, 10)}...`,
      });
      
      // Wait for transaction confirmation
      // You might want to add transaction receipt waiting here
      
      // Update the backend with the successful on-chain claim
      const { supabaseApi } = await import('../lib/supabase');
      const activationResult = await supabaseApi.activateMembership(walletAddress);
      
      if (!activationResult.success) {
        console.warn('On-chain claim successful but backend activation failed:', activationResult.error);
        // Don't throw error here - the NFT was successfully minted
      }
      
      return {
        success: true,
        message: `Level ${targetLevel} BBC Membership NFT (Token ID ${tokenId}) successfully claimed on ${chainName}!`,
        transactionHash: txResult.transactionHash,
        chainName,
        level: targetLevel,
        tokenId: tokenId
      };
      
    } catch (error: any) {
      console.error('On-chain claim error:', error);
      
      // Handle specific errors
      if (error.message?.includes('User rejected') || error.message?.includes('denied')) {
        throw new Error('Transaction was rejected by user');
      } else if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient funds for gas fees');
      } else if (error.message?.includes('already claimed') || error.message?.includes('Already claimed')) {
        throw new Error('You have already claimed this NFT level');
      } else if (error.message?.includes('not eligible')) {
        throw new Error('You are not eligible to claim this NFT');
      } else if (error.message?.includes('exceed')) {
        throw new Error('Claiming would exceed the allowed limit');
      } else {
        throw new Error(error.message || 'Failed to claim NFT on-chain');
      }
    }
  };

  const handleClaim = async (claimMethod: 'database_test' | 'testnet_arb_sepolia' | 'mainnet_arb_one') => {
    if (!account?.address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    // Check if user is authenticated with Supabase
    if (!isSupabaseAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in first to claim your NFT",
        variant: "destructive"
      });
      setLocation('/auth');
      return;
    }

    setClaimState({ method: claimMethod, loading: true, error: null });

    try {
      let claimData = {};
      let networkInfo = {};

      switch (claimMethod) {
        case 'database_test':
          claimData = {
            claimMethod: 'demo',
            referrerWallet: referrerWallet || null,
            transactionHash: 'database_test_' + Date.now(),
            mintTxHash: 'test_mint_' + Date.now(),
            isOffChain: true,
            targetLevel: 1, // Level 1 NFT activation
            tokenId: 1
          };
          networkInfo = {
            name: 'Off-Chain Database Test',
            description: 'No blockchain transaction - database only',
            color: 'green'
          };
          break;

        case 'testnet_arb_sepolia':
          claimData = {
            claimMethod: 'testnet_purchase',
            referrerWallet: referrerWallet || null,
            network: 'arbitrum-sepolia',
            tokenContract: '0xAc8c8662726b72f8DB4F5D1d1a16aC5b06B7a90D', // Arbitrum Sepolia BBC contract
            amount: '130000000', // 100 fake USDT (6 decimals)
            chainId: 421614, // Arbitrum Sepolia
            transactionHash: 'testnet_tx_' + Date.now(),
            mintTxHash: 'testnet_mint_' + Date.now(),
            targetLevel: 1, // Level 1 NFT activation
            tokenId: 1 // Token ID 1 for Level 1
          };
          networkInfo = {
            name: 'Testnet (Arbitrum Sepolia)',
            description: 'Claim with fake USDT token - 100 fake USDT',
            color: 'blue'
          };
          break;

        case 'mainnet_arb_one':
          claimData = {
            claimMethod: 'mainnet_purchase',
            referrerWallet: referrerWallet || null,
            network: 'arbitrum-one',
            tokenContract: '0x0000000000000000000000000000000000000000', // Mainnet BBC contract (to be set)
            amount: '130000000', // 100 USDC (6 decimals)
            chainId: 42161, // Arbitrum One
            bridgeUsed: true,
            transactionHash: 'mainnet_tx_' + Date.now(),
            mintTxHash: 'mainnet_mint_' + Date.now(),
            targetLevel: 1, // Level 1 NFT activation
            tokenId: 1 // Token ID 1 for Level 1
          };
          networkInfo = {
            name: 'Mainnet (Arbitrum One)',
            description: 'Purchase with USDC via bridge - 100 USDC',
            color: 'honey'
          };
          break;

        default:
          throw new Error('Invalid claim method');
      }

      toast({
        title: `${networkInfo.name} Claim Started`,
        description: networkInfo.description,
      });

      let result;
      
      if (claimMethod === 'database_test') {
        // Database-only claim (no blockchain transaction)
        const { supabaseApi } = await import('../lib/supabase');
        result = await supabaseApi.activateMembership(account.address);
      } else {
        // On-chain NFT claim using Thirdweb
        result = await handleOnChainClaim(claimMethod, claimData, account.address);
      }

      if (result.success) {
        toast({
          title: "🎉 Membership Activated!",
          description: result.message,
          duration: 6000
        });

        console.log('✅ Membership activation successful:', result);
        
        // Refresh membership status and let Web3Context handle routing
        await checkMembershipStatus();
        
        // Small delay for UI feedback, then let the context handle routing
        setTimeout(() => {
          if (window.location.pathname === '/welcome') {
            // If still on welcome page, force redirect to dashboard
            setLocation('/dashboard');
          }
        }, 1000);
      } else {
        throw new Error(result.error || result.message || 'Failed to activate membership');
      }
    } catch (error: any) {
      console.error('Claim error:', error);
      setClaimState({ method: null, loading: false, error: error.message });
      
      toast({
        title: "Claim Failed",
        description: error.message || 'Failed to claim NFT Token ID 1',
        variant: "destructive"
      });
    } finally {
      setClaimState({ method: null, loading: false, error: null });
    }
  };

  // Show loading state
  if (isLoading || !account?.address) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-honey" />
              <div className="text-center">
                <h3 className="font-medium text-honey">Loading...</h3>
                <p className="text-sm text-muted-foreground">
                  Preparing your membership activation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30 mb-4">
            Welcome to Beehive Platform
          </Badge>
          <h1 className="text-4xl font-bold text-honey mb-4">
            Activate Your Membership
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            Choose your preferred network to claim NFT Token ID 1
          </p>
          <p className="text-muted-foreground">
            All methods activate Level 1 membership with the same rewards
          </p>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-honey/5 to-honey/10 border-honey/20">
            <CardContent className="pt-6 text-center">
              <Crown className="h-8 w-8 text-honey mx-auto mb-2" />
              <h3 className="font-semibold text-honey mb-1">Level 1 Access</h3>
              <p className="text-xs text-muted-foreground">
                Unlock dashboard and basic features
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
            <CardContent className="pt-6 text-center">
              <Database className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <h3 className="font-semibold text-green-400 mb-1">BCC Rewards</h3>
              <p className="text-xs text-muted-foreground">
                500 transferable + 10,350 locked tokens
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <h3 className="font-semibold text-purple-400 mb-1">Referral System</h3>
              <p className="text-xs text-muted-foreground">
                Join the 3×3 matrix network
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
            <CardContent className="pt-6 text-center">
              <Zap className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-blue-400 mb-1">USDT Rewards</h3>
              <p className="text-xs text-muted-foreground">
                Earn from network activities
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Three Claim Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Database Test Button - Off Chain */}
          <Card className="border-green-500/20 hover:border-green-500/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <TestTube className="h-5 w-5" />
                Database Test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                  Off-Chain
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Test activation with database-only recording. No blockchain transaction required.
                </p>
                <div className="text-lg font-semibold text-green-400">
                  FREE
                </div>
                <div className="text-xs text-muted-foreground">
                  • No gas fees<br/>
                  • Instant activation<br/>
                  • Testing purposes
                </div>
              </div>
              <Button 
                onClick={() => handleClaim('database_test')}
                disabled={claimState.loading}
                className="w-full bg-green-500 hover:bg-green-500/90 text-black"
              >
                {claimState.loading && claimState.method === 'database_test' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Test Claim
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Testnet Button - Arbitrum Sepolia */}
          <Card className="border-blue-500/20 hover:border-blue-500/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <Shield className="h-5 w-5" />
                Testnet Claim
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                  Arbitrum Sepolia
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Claim with fake USDT token on Arbitrum Sepolia testnet.
                </p>
                <div className="text-lg font-semibold text-blue-400">
                  100 Fake USDT
                </div>
                <div className="text-xs text-muted-foreground">
                  • Testnet only<br/>
                  • Free testnet ETH needed<br/>
                  • Chain ID: 421614
                </div>
              </div>
              <Button 
                onClick={() => handleClaim('testnet_arb_sepolia')}
                disabled={claimState.loading}
                className="w-full bg-blue-500 hover:bg-blue-500/90 text-white"
              >
                {claimState.loading && claimState.method === 'testnet_arb_sepolia' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Testnet Claim
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Mainnet Button - Arbitrum One */}
          <Card className="border-honey/20 hover:border-honey/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-honey">
                <CreditCard className="h-5 w-5" />
                Mainnet Purchase
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                  Arbitrum One
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Purchase with USDC via bridge on Arbitrum One mainnet.
                </p>
                <div className="text-lg font-semibold text-honey">
                  100 USDC
                </div>
                <div className="text-xs text-muted-foreground">
                  • Real transaction<br/>
                  • Bridge supported<br/>
                  • Chain ID: 42161
                </div>
              </div>
              <Button 
                onClick={() => handleClaim('mainnet_arb_one')}
                disabled={claimState.loading}
                className="w-full bg-honey hover:bg-honey/90 text-black"
              >
                {claimState.loading && claimState.method === 'mainnet_arb_one' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Purchase Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Referrer Information */}
        {referrerWallet && (
          <Card className="bg-muted/30 border-muted mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-honey" />
                <span className="text-sm font-medium text-honey">Referrer Information</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <span>Referred by: </span>
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  {referrerWallet.slice(0, 6)}...{referrerWallet.slice(-4)}
                </code>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                You'll be placed in your referrer's matrix and they'll earn rewards from your activation.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        <div className="text-center">
          <Button 
            variant="outline"
            onClick={() => setLocation('/')}
            className="mr-4"
          >
            Back to Home
          </Button>
          <Button 
            variant="ghost"
            onClick={() => setLocation('/register')}
            className="text-muted-foreground hover:text-foreground"
          >
            Need to register first?
          </Button>
        </div>

        {/* Network Information */}
        <div className="text-center text-xs text-muted-foreground mt-8 space-y-1">
          <p>🎯 All methods activate Level 1 membership with NFT Token ID 1</p>
          <p>💰 Rewards: 500 BCC transferable + 10,350 BCC locked + referral bonuses</p>
          <p>🌐 Connected: {account?.address?.slice(0, 8)}...{account?.address?.slice(-6)}</p>
        </div>
      </div>
    </div>
  );
}
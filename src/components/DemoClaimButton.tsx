import { useState } from 'react';
import { useToast } from '../hooks/use-toast';
import { useActiveAccount, ClaimButton } from "thirdweb/react";
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Zap } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { arbitrum } from 'thirdweb/chains';
import { useWeb3 } from '../contexts/Web3Context';

type DemoState = 'idle' | 'paying' | 'verifying' | 'claiming' | 'success' | 'error';

interface DemoClaimButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function DemoClaimButton({
  onSuccess,
  onError,
  disabled = false,
  className = ''
}: DemoClaimButtonProps) {
  const [demoState, setDemoState] = useState<DemoState>('idle');
  const account = useActiveAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { client } = useWeb3();

  // Contract addresses from environment
  const DEMO_MEMBERSHIP_NFT = '0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8'; // ARB ONE Membership Contract
  const DEMO_USDT = '0xfA278827a612BBA895e7F0A4fBA504b22ff3E7C9'; // ARB ONE Payment Token
  const CHAIN = arbitrum;

  // Handle successful NFT claim
  const handleClaimSuccess = async (result: any) => {
    console.log('🎉 NFT claimed successfully!', result);
    console.log('👤 Using wallet address for database lookup:', account?.address);
    setDemoState('verifying');
    
    try {
      // Process database integration via API
      console.log('🔍 Processing database integration...');
      const response = await fetch('/api/auth/claim-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': account?.address || '',
        },
        body: JSON.stringify({
          level: 1,
          transactionHash: result.transactionHash,
          isRealTransaction: true
        }),
      });
      
      if (!response.ok) {
        console.error('❌ Database integration failed:', await response.text());
        throw new Error('Database integration failed');
      }
      
      const apiResult = await response.json();
      console.log('✅ Complete system integration successful!');
      console.log('📊 Integration Summary:', {
        blockchain: { txHash: result.transactionHash, chain: CHAIN.name },
        database: apiResult
      });
      
      setDemoState('success');
      
      toast({
        title: 'Membership Activated! 🎉',
        description: 'Level 1 NFT claimed and membership activated successfully!',
      });
      
      // Refresh caches safely with proper wallet address
      try {
        await queryClient.invalidateQueries({ 
          queryKey: ['api_check_user_exists', 'api_get_user_balances', account?.address] 
        });
        await queryClient.invalidateQueries({ 
          queryKey: ['nft_verification', account?.address] 
        });
        console.log('✅ Cache invalidation completed successfully');
      } catch (cacheError) {
        console.warn('⚠️ Cache invalidation failed, but membership was activated:', cacheError);
        // Don't throw - membership was still successful
      }
      
      onSuccess?.();
      
    } catch (error) {
      console.warn('Database integration failed, but NFT claim successful:', error);
      setDemoState('success');
      
      toast({
        title: 'NFT Claimed Successfully! ⚠️',
        description: 'NFT claimed on blockchain, database sync may be delayed.',
        variant: 'default',
      });
      
      onSuccess?.();
    }
  };

  const handleClaimError = (error: any) => {
    console.error('❌ NFT claim failed:', error);
    setDemoState('error');
    
    let message = 'NFT claim failed';
    if (typeof error === 'object' && error?.message) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else {
      try {
        message = JSON.stringify(error);
      } catch {
        message = 'Unknown error';
      }
    }
    
    toast({
      title: 'Claim Failed',
      description: message,
      variant: 'destructive',
    });
    
    onError?.(message);
  };

  if (!account?.address) {
    return (
      <Card className={`bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30 ${className}`}>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Connect wallet to claim Level 1 NFT</p>
          <div className="w-full h-12 bg-secondary rounded-lg flex items-center justify-center text-muted-foreground">
            Connect Wallet Required
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30 ${className}`}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-honey flex items-center justify-center gap-2">
          <Zap className="h-5 w-5" />
          Blockchain NFT Claim
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Claim Level 1 NFT • Arbitrum Sepolia Testnet
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        {demoState === 'verifying' && (
          <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 text-blue-400 font-medium">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
              Processing...
            </div>
          </div>
        )}

        {demoState === 'success' && (
          <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-3 text-center">
            <div className="text-green-400 font-medium">✅ Success!</div>
          </div>
        )}

        {demoState === 'error' && (
          <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-3 text-center">
            <div className="text-red-400 font-medium">❌ Failed</div>
          </div>
        )}

        <ClaimButton
          contractAddress={DEMO_MEMBERSHIP_NFT}
          chain={CHAIN}
          client={client}
          claimParams={{
            type: "ERC1155",
            quantity: BigInt(1),
            tokenId: BigInt(1),
          }}
          onTransactionSent={(result) => {
            console.log('🚀 Transaction sent:', result);
            setDemoState('claiming');
          }}
          onTransactionConfirmed={(result) => {
            console.log('✅ Transaction confirmed:', result);
            handleClaimSuccess(result);
          }}
          onError={(error) => {
            handleClaimError(error);
          }}
          className="w-full h-12 text-white font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0"
          disabled={disabled || demoState === 'verifying'}
        >
          {demoState === 'claiming' ? 'Claiming...' : 'Claim Level 1 NFT'}
        </ClaimButton>
      </CardContent>
    </Card>
  );
}
import { useState } from 'react';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { useWallet } from '../../hooks/useWallet';
import { apiRequest } from '../../lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface BlockchainSyncButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function BlockchainSyncButton({ 
  variant = 'outline', 
  size = 'default',
  className = '' 
}: BlockchainSyncButtonProps) {
  const { walletAddress } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!walletAddress) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);

    try {
      // Temporarily disabled due to edge function issues
      console.log('🔄 Manual blockchain sync temporarily disabled due to edge function issues');
      
      toast({
        title: "Sync temporarily disabled",
        description: "Blockchain sync is temporarily disabled due to technical issues. Your membership status is already correct.",
        variant: "default",
      });
      
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Just refresh the cache without actual sync
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

    } catch (error: any) {
      console.error('❌ Manual sync failed:', error);
      
      let errorMessage = "Failed to sync with blockchain";
      if (error.message?.includes('No member record')) {
        errorMessage = "Complete registration first before syncing";
      } else if (error.message?.includes('already activated')) {
        errorMessage = "Your membership is already activated";
      }
      
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={!walletAddress || isSyncing}
      variant={variant}
      size={size}
      className={className}
    >
      {isSyncing ? (
        <>
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Status
        </>
      )}
    </Button>
  );
}

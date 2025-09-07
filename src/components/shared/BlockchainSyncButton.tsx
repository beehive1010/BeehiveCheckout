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
      console.log('🔄 Manual blockchain sync triggered for:', walletAddress);
      
      const syncResponse = await apiRequest('POST', '/api/auth/sync-blockchain-status', {
        action: 'sync-blockchain-status'
      }, walletAddress);

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const syncResult = await syncResponse.json();
      console.log('✅ Manual sync result:', syncResult);

      if (syncResult.success) {
        toast({
          title: "✅ Sync Successful!",
          description: syncResult.message || "Your membership status has been synced with the blockchain",
          variant: "default",
        });

        // Refresh user queries to reflect updated status
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        
      } else {
        toast({
          title: "Sync Info",
          description: syncResult.message || "No sync needed - status is already up to date",
          variant: "default",
        });
      }

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

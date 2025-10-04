import React, { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { useToast } from '../../hooks/use-toast';
import { 
  withdrawalSignatureManager,
  type WithdrawalSignatureRequest,
  type SignedWithdrawalRequest
} from '../../lib/web3/withdrawal-signatures';
import { serverWalletAPI } from '../../lib/apiClient/serverWallet';
import { MULTI_CHAIN_CONFIG, getSupportedPaymentChains } from '../../lib/web3/multi-chain-config';
import {
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  DollarSign,
  Network,
  FileSignature,
  Send,
  Info,
  ExternalLink
} from 'lucide-react';

interface WithdrawalSignatureRequestProps {
  onSignatureComplete: (signedRequest: SignedWithdrawalRequest) => void;
  onCancel: () => void;
  className?: string;
}

export function WithdrawalSignatureRequest({
  onSignatureComplete,
  onCancel,
  className = ""
}: WithdrawalSignatureRequestProps) {
  const account = useActiveAccount();
  const { toast } = useToast();

  // Form state
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalSignatureRequest>({
    userWallet: '',
    amount: '',
    targetChainId: MULTI_CHAIN_CONFIG.arbitrum.chainId,
    tokenAddress: ''
  });

  // UI state
  const [isSigningInProgress, setIsSigningInProgress] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string>('');
  const [gasEstimate, setGasEstimate] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const supportedChains = getSupportedPaymentChains();

  // Initialize wallet address when account changes
  useEffect(() => {
    if (account?.address) {
      setWithdrawalData(prev => ({
        ...prev,
        userWallet: account.address,
        tokenAddress: prev.tokenAddress || getUSDTAddressForChain(prev.targetChainId)
      }));
    }
  }, [account?.address]);

  // Update token address when chain changes
  useEffect(() => {
    const tokenAddress = getUSDTAddressForChain(withdrawalData.targetChainId);
    if (tokenAddress) {
      setWithdrawalData(prev => ({
        ...prev,
        tokenAddress
      }));
    }
  }, [withdrawalData.targetChainId]);

  // Generate gas estimate when form changes
  useEffect(() => {
    if (withdrawalData.amount && withdrawalData.targetChainId && parseFloat(withdrawalData.amount) > 0) {
      estimateGasFees();
    }
  }, [withdrawalData.amount, withdrawalData.targetChainId]);

  const getUSDTAddressForChain = (chainId: number): string => {
    const chainConfig = supportedChains.find(c => c.chainId === chainId);
    return chainConfig?.usdcAddress || '';
  };

  const estimateGasFees = async () => {
    try {
      const result = await serverWalletAPI.estimateGas({
        target_chain_id: withdrawalData.targetChainId,
        amount: withdrawalData.amount
      });

      if (result.success && result.estimate) {
        setGasEstimate(result.estimate);
      }
    } catch (error) {
      console.warn('Gas estimation failed:', error);
    }
  };

  const handlePreviewSignature = () => {
    const validation = withdrawalSignatureManager.validateWithdrawalRequest(withdrawalData);
    if (!validation.isValid) {
      toast({
        title: "Invalid Request",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    const previewMessage = withdrawalSignatureManager.generateHumanReadableMessage(withdrawalData);
    setSignaturePreview(previewMessage);
    setShowPreview(true);
  };

  const handleCreateSignature = async () => {
    if (!account) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to continue",
        variant: "destructive"
      });
      return;
    }

    setIsSigningInProgress(true);

    try {
      const result = await withdrawalSignatureManager.createSignedWithdrawalRequest(
        withdrawalData,
        account
      );

      if (result.success && result.signedRequest) {
        toast({
          title: "✅ Signature Created!",
          description: "Your withdrawal request has been signed and is ready for processing",
          duration: 5000
        });

        onSignatureComplete(result.signedRequest);
      } else {
        toast({
          title: "Signature Failed",
          description: result.error || 'Failed to create signature',
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Signature creation failed:', error);
      toast({
        title: "Signature Error",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsSigningInProgress(false);
    }
  };

  const selectedChain = supportedChains.find(c => c.chainId === withdrawalData.targetChainId);
  const validation = withdrawalSignatureManager.validateWithdrawalRequest(withdrawalData);

  if (showPreview) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 mb-4">
            Signature Preview
          </Badge>
          <h3 className="text-xl font-bold text-honey mb-2">Review Withdrawal Request</h3>
          <p className="text-muted-foreground">
            Please review the details below before signing
          </p>
        </div>

        <Card className="border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-blue-400" />
              Withdrawal Authorization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <pre className="whitespace-pre-wrap text-sm bg-muted/30 rounded-lg p-4 border">
              {signaturePreview}
            </pre>

            {/* Gas Estimate */}
            {gasEstimate && (
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium mb-2 text-honey">Network Fees</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Gas Fee:</span>
                    <span>${gasEstimate.total_fee_usd}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Time:</span>
                    <span>{gasEstimate.estimated_time_minutes} minutes</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowPreview(false)}
                className="flex-1"
              >
                Edit Request
              </Button>
              <Button
                onClick={handleCreateSignature}
                disabled={isSigningInProgress}
                className="flex-1 bg-blue-500 hover:bg-blue-500/90 text-white"
              >
                {isSigningInProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Sign Request
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30 mb-4">
          Secure Withdrawal Request
        </Badge>
        <h3 className="text-xl font-bold text-honey mb-2">Create Withdrawal Signature</h3>
        <p className="text-muted-foreground">
          Sign a secure withdrawal request to authorize fund transfer
        </p>
      </div>

      <Card className="border-honey/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-honey" />
            Withdrawal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Withdrawal Amount (USDT)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                value={withdrawalData.amount}
                onChange={(e) => setWithdrawalData(prev => ({ ...prev, amount: e.target.value }))}
                className="pl-10"
                min="1"
                max="10000"
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum: $1 USDT • Maximum: $10,000 USDT per transaction
            </p>
          </div>

          <Separator />

          {/* Chain Selection */}
          <div className="space-y-4">
            <Label>Destination Blockchain</Label>
            
            <Select 
              value={withdrawalData.targetChainId.toString()} 
              onValueChange={(value) => setWithdrawalData(prev => ({
                ...prev,
                targetChainId: Number(value)
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose destination chain" />
              </SelectTrigger>
              <SelectContent>
                {supportedChains.filter(chain => !chain.isTestnet).map((chain) => (
                  <SelectItem key={chain.chainId} value={chain.chainId.toString()}>
                    <div className="flex items-center gap-3">
                      <i className={`${chain.icon} ${chain.color}`} />
                      <div>
                        <div className="font-medium">{chain.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Fee: ~${chain.averageGasFee}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Selected Chain Info */}
            {selectedChain && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center`}>
                      <i className={`${selectedChain.icon} ${selectedChain.color} text-sm`} />
                    </div>
                    <div>
                      <div className="font-medium">{selectedChain.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Chain ID: {selectedChain.chainId}
                      </div>
                    </div>
                  </div>
                  <Badge variant="default">Mainnet</Badge>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Wallet Address (Read-only) */}
          <div className="space-y-2">
            <Label>Your Wallet Address</Label>
            <Input
              value={withdrawalData.userWallet}
              readOnly
              className="bg-muted/30 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Funds will be sent to this wallet address
            </p>
          </div>

          {/* Token Address (Auto-filled) */}
          <div className="space-y-2">
            <Label>USDT Token Contract</Label>
            <div className="flex gap-2">
              <Input
                value={withdrawalData.tokenAddress}
                readOnly
                className="bg-muted/30 cursor-not-allowed flex-1"
              />
              {withdrawalData.tokenAddress && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`${selectedChain?.explorerUrl}/token/${withdrawalData.tokenAddress}`, '_blank')}
                  className="px-3"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Gas Estimate Preview */}
          {gasEstimate && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Network className="h-4 w-4 text-honey" />
                Network Fee Estimate
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Gas Fee:</span>
                  <span>${gasEstimate.total_fee_usd}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Time:</span>
                  <span>{gasEstimate.estimated_time_minutes} minutes</span>
                </div>
              </div>
            </div>
          )}

          {/* Validation Messages */}
          {!validation.isValid && withdrawalData.amount && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Validation Error</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {validation.error}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePreviewSignature}
              disabled={!validation.isValid || !account?.address}
              className="flex-1 bg-honey hover:bg-honey/90 text-black"
            >
              <FileSignature className="mr-2 h-4 w-4" />
              Preview Signature
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="space-y-2 text-sm">
              <div className="font-medium text-blue-400">Security Information</div>
              <ul className="text-muted-foreground space-y-1">
                <li>• Your signature authorizes the withdrawal from our secure server wallet</li>
                <li>• Signatures expire after 1 hour for security</li>
                <li>• Never sign withdrawal requests from untrusted sources</li>
                <li>• All withdrawals are processed automatically upon signature verification</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useToast } from '../../hooks/use-toast';
import { 
  withdrawalSignatureManager,
  type SignedWithdrawalRequest
} from '../../lib/web3/withdrawal-signatures';
import { getChainConfig } from '../../lib/web3/multi-chain-config';
import {
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Copy,
  RefreshCw,
  Send,
  Eye,
  FileSignature
} from 'lucide-react';

interface SignatureVerificationDisplayProps {
  signedRequest: SignedWithdrawalRequest;
  onSubmitWithdrawal: (signedRequest: SignedWithdrawalRequest) => Promise<void>;
  onCreateNewSignature: () => void;
  isSubmitting?: boolean;
  className?: string;
}

export function SignatureVerificationDisplay({
  signedRequest,
  onSubmitWithdrawal,
  onCreateNewSignature,
  isSubmitting = false,
  className = ""
}: SignatureVerificationDisplayProps) {
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [signatureStatus, setSignatureStatus] = useState<'valid' | 'expired' | 'invalid'>('valid');

  // Update time remaining every second
  useEffect(() => {
    const updateTimer = () => {
      const status = withdrawalSignatureManager.getSignatureStatus(signedRequest);
      setSignatureStatus(status.status);
      setTimeRemaining(status.timeRemaining || 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [signedRequest]);

  const chainConfig = getChainConfig(signedRequest.targetChainId);
  const chainName = chainConfig?.name || `Chain ${signedRequest.targetChainId}`;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
        duration: 2000
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    return withdrawalSignatureManager.formatTimeRemaining(seconds);
  };

  const getStatusColor = (status: 'valid' | 'expired' | 'invalid'): string => {
    switch (status) {
      case 'valid':
        return 'text-green-400';
      case 'expired':
        return 'text-red-400';
      case 'invalid':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: 'valid' | 'expired' | 'invalid') => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'expired':
        return <Clock className="h-5 w-5 text-red-400" />;
      case 'invalid':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
    }
  };

  const getProgressPercentage = (): number => {
    if (signatureStatus !== 'valid' || !timeRemaining) return 0;
    
    const totalTime = 3600; // 1 hour in seconds
    const elapsed = totalTime - timeRemaining;
    return Math.min((elapsed / totalTime) * 100, 100);
  };

  const handleSubmitWithdrawal = async () => {
    if (signatureStatus !== 'valid') {
      toast({
        title: "Cannot Submit",
        description: "Signature is not valid or has expired",
        variant: "destructive"
      });
      return;
    }

    await onSubmitWithdrawal(signedRequest);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <Badge 
          variant="outline" 
          className={`mb-4 ${
            signatureStatus === 'valid' 
              ? 'bg-green-500/10 text-green-400 border-green-500/30'
              : signatureStatus === 'expired'
              ? 'bg-red-500/10 text-red-400 border-red-500/30'
              : 'bg-destructive/10 text-destructive border-destructive/30'
          }`}
        >
          {getStatusIcon(signatureStatus)}
          <span className="ml-2">
            {signatureStatus === 'valid' ? 'Signature Valid' : 
             signatureStatus === 'expired' ? 'Signature Expired' : 'Invalid Signature'}
          </span>
        </Badge>
        <h3 className="text-xl font-bold text-honey mb-2">Withdrawal Authorization Ready</h3>
        <p className="text-muted-foreground">
          Your withdrawal request has been signed and verified
        </p>
      </div>

      {/* Signature Status Card */}
      <Card className={`border-2 ${
        signatureStatus === 'valid' 
          ? 'border-green-500/20 bg-green-500/5'
          : signatureStatus === 'expired'
          ? 'border-red-500/20 bg-red-500/5'
          : 'border-destructive/20 bg-destructive/5'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${getStatusColor(signatureStatus)}`} />
            Signature Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {signatureStatus === 'valid' && timeRemaining > 0 && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Time Remaining:</span>
                  <span className="font-mono text-green-400">
                    {formatTimeRemaining(timeRemaining)}
                  </span>
                </div>
                <Progress 
                  value={getProgressPercentage()} 
                  className="h-2 bg-muted"
                />
              </div>
              <p className="text-sm text-green-400">
                ✅ Signature is valid and ready for processing
              </p>
            </>
          )}

          {signatureStatus === 'expired' && (
            <p className="text-sm text-red-400">
              ⏰ This signature has expired. Please create a new one to proceed.
            </p>
          )}

          {signatureStatus === 'invalid' && (
            <p className="text-sm text-destructive">
              ❌ This signature is invalid. Please create a new one.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Details */}
      <Card className="border-honey/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-honey" />
            Withdrawal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Amount</Label>
              <div className="text-lg font-semibold text-honey">
                {parseFloat(signedRequest.amount).toLocaleString()} USDT
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Destination Chain</Label>
              <div className="flex items-center gap-2">
                {chainConfig && <i className={`${chainConfig.icon} ${chainConfig.color}`} />}
                <span className="font-medium">{chainName}</span>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">Recipient Wallet</Label>
            <div className="flex items-center gap-2">
              <code className="bg-muted px-2 py-1 rounded text-sm flex-1">
                {signedRequest.userWallet}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(signedRequest.userWallet, "Wallet address")}
                className="p-2"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">Token Contract</Label>
            <div className="flex items-center gap-2">
              <code className="bg-muted px-2 py-1 rounded text-sm flex-1">
                {signedRequest.tokenAddress}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(signedRequest.tokenAddress, "Token address")}
                className="p-2"
              >
                <Copy className="h-4 w-4" />
              </Button>
              {chainConfig && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`${chainConfig.explorerUrl}/token/${signedRequest.tokenAddress}`, '_blank')}
                  className="p-2"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground">Signature Hash</Label>
            <div className="flex items-center gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs flex-1 truncate">
                {signedRequest.signature}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(signedRequest.signature, "Signature")}
                className="p-2"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {signatureStatus !== 'valid' ? (
          <Button
            onClick={onCreateNewSignature}
            className="flex-1 bg-honey hover:bg-honey/90 text-black"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Create New Signature
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={onCreateNewSignature}
              className="flex-1"
            >
              Create New
            </Button>
            <Button
              onClick={handleSubmitWithdrawal}
              disabled={isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-600/90 text-white"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Withdrawal
                </>
              )}
            </Button>
          </>
        )}
      </div>

      {/* Security Information */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="space-y-2 text-sm">
              <div className="font-medium text-blue-400">Security & Processing Information</div>
              <ul className="text-muted-foreground space-y-1">
                <li>• Your signature ensures secure authorization of this withdrawal</li>
                <li>• Processing typically takes 1-5 minutes depending on network congestion</li>
                <li>• You'll receive a transaction hash once the withdrawal is processed</li>
                <li>• Signatures automatically expire after 1 hour for security</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Label component if not available
const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
    {children}
  </label>
);
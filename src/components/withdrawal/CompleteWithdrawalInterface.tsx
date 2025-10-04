import React, { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../../hooks/use-toast';

// Import all withdrawal components
import { WithdrawalSignatureRequest } from './WithdrawalSignatureRequest';
import { SignatureVerificationDisplay } from './SignatureVerificationDisplay';
import { FeeCalculatorDisplay } from '../fees/FeeCalculatorDisplay';
import { TransactionMonitorDisplay } from '../transaction/TransactionMonitorDisplay';

// Import processing systems
import { 
  automatedWithdrawalProcessor,
  type WithdrawalProcessingStatus,
  type WithdrawalProcessingResult,
  type WithdrawalProcessingConfig
} from '../../lib/web3/automated-withdrawal-processor';
import { type SignedWithdrawalRequest } from '../../lib/web3/withdrawal-signatures';
import { serverWalletAPI } from '../../lib/apiClient/serverWallet';

import {
  Wallet,
  ArrowRight,
  Settings,
  History,
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  ExternalLink,
  Copy,
  TrendingUp
} from 'lucide-react';

// Withdrawal flow stages
type WithdrawalFlowStage = 'amount_selection' | 'signature_creation' | 'signature_verification' | 'processing' | 'monitoring' | 'completed';

interface CompleteWithdrawalInterfaceProps {
  className?: string;
}

export function CompleteWithdrawalInterface({ className = "" }: CompleteWithdrawalInterfaceProps) {
  const account = useActiveAccount();
  const { toast } = useToast();

  // Flow state
  const [currentStage, setCurrentStage] = useState<WithdrawalFlowStage>('amount_selection');
  const [signedRequest, setSignedRequest] = useState<SignedWithdrawalRequest | null>(null);
  
  // Processing state
  const [processingStatus, setProcessingStatus] = useState<WithdrawalProcessingStatus | null>(null);
  const [processingResult, setProcessingResult] = useState<WithdrawalProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Configuration
  const [processingConfig, setProcessingConfig] = useState<WithdrawalProcessingConfig>({
    enableMonitoring: true,
    monitoringTimeout: 30,
    requiredConfirmations: 12,
    retryAttempts: 3
  });

  // User withdrawal history
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load withdrawal history on mount
  useEffect(() => {
    if (account?.address) {
      loadWithdrawalHistory();
    }
  }, [account?.address]);

  const loadWithdrawalHistory = async () => {
    if (!account?.address) return;

    setHistoryLoading(true);
    try {
      const result = await serverWalletAPI.getWithdrawalHistory(account.address, 10);
      if (result.success && result.withdrawals) {
        setWithdrawalHistory(result.withdrawals);
      }
    } catch (error) {
      console.error('Failed to load withdrawal history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSignatureComplete = (newSignedRequest: SignedWithdrawalRequest) => {
    setSignedRequest(newSignedRequest);
    setCurrentStage('signature_verification');
    
    toast({
      title: "Signature Created! 🖊️",
      description: "Your withdrawal request has been signed and is ready for processing",
      duration: 4000
    });
  };

  const handleCreateNewSignature = () => {
    setSignedRequest(null);
    setProcessingStatus(null);
    setProcessingResult(null);
    setCurrentStage('amount_selection');
  };

  const handleSubmitWithdrawal = async (signedReq: SignedWithdrawalRequest) => {
    setIsProcessing(true);
    setProcessingStatus(null);
    setProcessingResult(null);
    setCurrentStage('processing');

    try {
      // Start the automated withdrawal processing
      const result = await automatedWithdrawalProcessor.processWithdrawal(
        signedReq,
        processingConfig,
        (status: WithdrawalProcessingStatus) => {
          setProcessingStatus(status);
          
          // Move to monitoring stage when transaction is submitted
          if (status.stage === 'transaction_monitoring') {
            setCurrentStage('monitoring');
          }
        }
      );

      setProcessingResult(result);
      
      if (result.success) {
        setCurrentStage('completed');
        toast({
          title: "🎉 Withdrawal Completed!",
          description: `Transaction confirmed: ${result.transactionHash?.slice(0, 10)}...`,
          duration: 6000
        });
        
        // Refresh withdrawal history
        await loadWithdrawalHistory();
      } else {
        toast({
          title: "Withdrawal Failed",
          description: result.error || "Processing failed",
          variant: "destructive",
          duration: 6000
        });
      }

    } catch (error) {
      console.error('Withdrawal processing failed:', error);
      toast({
        title: "Processing Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

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

  const formatAmount = (amount: string): string => {
    return parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  const getStageIcon = (stage: WithdrawalFlowStage) => {
    switch (stage) {
      case 'amount_selection':
        return <DollarSign className="h-4 w-4" />;
      case 'signature_creation':
        return <Settings className="h-4 w-4" />;
      case 'signature_verification':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'monitoring':
        return <Activity className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStageName = (stage: WithdrawalFlowStage): string => {
    switch (stage) {
      case 'amount_selection':
        return 'Configure Withdrawal';
      case 'signature_creation':
        return 'Create Signature';
      case 'signature_verification':
        return 'Verify Signature';
      case 'processing':
        return 'Processing';
      case 'monitoring':
        return 'Monitoring';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  if (!account?.address) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="border-honey/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <Wallet className="h-12 w-12 text-honey mx-auto mb-4" />
              <h3 className="text-xl font-bold text-honey mb-2">Connect Your Wallet</h3>
              <p className="text-muted-foreground">
                Please connect your wallet to access withdrawal features
              </p>
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
          Complete Withdrawal System
        </Badge>
        <h2 className="text-2xl font-bold text-honey mb-2">Secure Cross-Chain Withdrawals</h2>
        <p className="text-muted-foreground">
          Withdraw your funds securely across multiple blockchain networks
        </p>
      </div>

      {/* Progress Indicator */}
      <Card className="border-honey/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStageIcon(currentStage)}
              <span className="font-medium text-honey">{getStageName(currentStage)}</span>
            </div>
            
            {processingStatus && (
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  Progress: {processingStatus.progress}%
                </div>
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-honey transition-all duration-300"
                    style={{ width: `${processingStatus.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Interface */}
      <Tabs defaultValue="withdrawal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="withdrawal">Withdrawal</TabsTrigger>
          <TabsTrigger value="calculator">Fee Calculator</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Withdrawal Tab */}
        <TabsContent value="withdrawal" className="space-y-6">
          {/* Amount Selection Stage */}
          {currentStage === 'amount_selection' && (
            <WithdrawalSignatureRequest
              onSignatureComplete={handleSignatureComplete}
              onCancel={() => setCurrentStage('amount_selection')}
            />
          )}

          {/* Signature Verification Stage */}
          {currentStage === 'signature_verification' && signedRequest && (
            <SignatureVerificationDisplay
              signedRequest={signedRequest}
              onSubmitWithdrawal={handleSubmitWithdrawal}
              onCreateNewSignature={handleCreateNewSignature}
              isSubmitting={isProcessing}
            />
          )}

          {/* Processing Stage */}
          {(currentStage === 'processing' || currentStage === 'monitoring') && processingStatus && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className={`h-5 w-5 text-blue-400 ${isProcessing ? 'animate-spin' : ''}`} />
                  {currentStage === 'processing' ? 'Processing Withdrawal' : 'Monitoring Transaction'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Current Stage:</span>
                    <Badge variant="outline" className="capitalize">
                      {processingStatus.stage.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress:</span>
                      <span>{processingStatus.progress}%</span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${processingStatus.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm">{processingStatus.message}</p>
                    
                    {processingStatus.transactionHash && (
                      <div className="mt-3 pt-3 border-t border-muted">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Transaction Hash:</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(processingStatus.transactionHash!, "Transaction hash")}
                              className="p-1"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`https://etherscan.io/tx/${processingStatus.transactionHash}`, '_blank')}
                              className="p-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <code className="text-xs bg-muted px-2 py-1 rounded block mt-1 truncate">
                          {processingStatus.transactionHash}
                        </code>
                      </div>
                    )}

                    {processingStatus.confirmations !== undefined && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Confirmations: {processingStatus.confirmations} / {processingConfig.requiredConfirmations}
                      </div>
                    )}

                    {processingStatus.estimatedTimeRemaining && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Est. time remaining: {Math.ceil(processingStatus.estimatedTimeRemaining / 60)} minutes
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed Stage */}
          {currentStage === 'completed' && processingResult && (
            <Card className={`border-2 ${
              processingResult.success 
                ? 'border-green-500/20 bg-green-500/5'
                : 'border-red-500/20 bg-red-500/5'
            }`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {processingResult.success ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      Withdrawal Completed Successfully
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      Withdrawal Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {processingResult.success ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Processing Time:</span>
                        <div className="font-medium">
                          {Math.ceil(processingResult.totalProcessingTime / 1000)}s
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Total Fees:</span>
                        <div className="font-medium">
                          ${processingResult.fees.fees?.totalFee.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </div>

                    {processingResult.transactionHash && (
                      <div className="bg-muted/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Transaction Hash:</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(processingResult.transactionHash!, "Transaction hash")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`https://etherscan.io/tx/${processingResult.transactionHash}`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                          {processingResult.transactionHash}
                        </code>
                      </div>
                    )}

                    <Button
                      onClick={handleCreateNewSignature}
                      className="w-full bg-honey hover:bg-honey/90 text-black"
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Create New Withdrawal
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <p className="text-sm text-destructive">
                        {processingResult.error}
                      </p>
                    </div>
                    
                    <Button
                      onClick={handleCreateNewSignature}
                      className="w-full bg-honey hover:bg-honey/90 text-black"
                    >
                      Try Again
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Fee Calculator Tab */}
        <TabsContent value="calculator">
          <FeeCalculatorDisplay />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Withdrawal History
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadWithdrawalHistory}
                  disabled={historyLoading}
                  className="ml-auto"
                >
                  <RefreshCw className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawalHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No withdrawal history found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {withdrawalHistory.map((withdrawal, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          withdrawal.status === 'completed' ? 'bg-green-400' :
                          withdrawal.status === 'pending' ? 'bg-yellow-400' :
                          'bg-red-400'
                        }`} />
                        <div>
                          <div className="font-medium">{formatAmount(withdrawal.amount)} USDT</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(withdrawal.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {withdrawal.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
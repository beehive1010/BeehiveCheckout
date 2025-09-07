import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { useToast } from '../../hooks/use-toast';
import { 
  transactionMonitor,
  type TransactionMonitorConfig,
  type MonitoringResult,
  type TransactionEvent,
  type TransactionStatus
} from '../../lib/web3/transaction-monitor';
import { getChainConfig } from '../../lib/web3/multi-chain-config';
import {
  Search,
  Clock,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  RefreshCw,
  Eye,
  Activity,
  Network,
  Hash,
  Timer,
  Zap,
  XCircle,
  Info,
  TrendingUp
} from 'lucide-react';

interface TransactionMonitorDisplayProps {
  initialTxHash?: string;
  initialChainId?: number;
  onStatusUpdate?: (status: TransactionStatus, details?: any) => void;
  className?: string;
}

interface MonitoredTransaction {
  config: TransactionMonitorConfig;
  result: MonitoringResult | null;
  startTime: number;
  isActive: boolean;
}

export function TransactionMonitorDisplay({
  initialTxHash = '',
  initialChainId = 42161, // Arbitrum
  onStatusUpdate,
  className = ""
}: TransactionMonitorDisplayProps) {
  const { toast } = useToast();

  // Form state
  const [txHash, setTxHash] = useState(initialTxHash);
  const [chainId, setChainId] = useState(initialChainId);
  const [requiredConfirmations, setRequiredConfirmations] = useState(12);

  // Monitoring state
  const [monitoredTx, setMonitoredTx] = useState<MonitoredTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Update confirmations when chain changes
  useEffect(() => {
    const recommended = transactionMonitor.getRecommendedConfirmations(chainId);
    setRequiredConfirmations(recommended);
  }, [chainId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (monitoredTx?.isActive) {
        const monitorId = `${monitoredTx.config.chainId}-${monitoredTx.config.txHash}`;
        transactionMonitor.stopMonitoring(monitorId);
      }
    };
  }, []);

  const startMonitoring = async () => {
    if (!txHash || !chainId) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid transaction hash and select a chain",
        variant: "destructive"
      });
      return;
    }

    if (monitoredTx?.isActive) {
      toast({
        title: "Already Monitoring",
        description: "Stop current monitoring before starting a new one",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    const config: TransactionMonitorConfig = {
      txHash,
      chainId,
      requiredConfirmations,
      timeoutMinutes: 60, // 1 hour timeout
      retryCount: 5
    };

    try {
      const result = await transactionMonitor.startMonitoring(
        config,
        (monitoringResult: MonitoringResult) => {
          setMonitoredTx(prev => prev ? {
            ...prev,
            result: monitoringResult,
            isActive: !monitoringResult.isComplete
          } : null);

          // Notify parent component
          if (onStatusUpdate && monitoringResult.transaction) {
            onStatusUpdate(monitoringResult.transaction.status, monitoringResult.transaction);
          }

          // Show completion notifications
          if (monitoringResult.isComplete && monitoringResult.transaction) {
            const status = monitoringResult.transaction.status;
            toast({
              title: status === 'confirmed' ? "✅ Transaction Confirmed!" : "❌ Transaction Failed",
              description: `Transaction ${status} with ${monitoringResult.transaction.confirmations} confirmations`,
              duration: 5000
            });
          }
        }
      );

      if (result.success) {
        setMonitoredTx({
          config,
          result: null,
          startTime: Date.now(),
          isActive: true
        });

        toast({
          title: "Monitoring Started",
          description: "Transaction monitoring has been initiated",
          duration: 3000
        });
      } else {
        toast({
          title: "Monitoring Failed",
          description: result.error || "Failed to start monitoring",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Monitoring start failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start monitoring",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopMonitoring = () => {
    if (monitoredTx?.isActive) {
      const monitorId = `${monitoredTx.config.chainId}-${monitoredTx.config.txHash}`;
      transactionMonitor.stopMonitoring(monitorId);
      
      setMonitoredTx(prev => prev ? {
        ...prev,
        isActive: false
      } : null);

      toast({
        title: "Monitoring Stopped",
        description: "Transaction monitoring has been stopped",
        duration: 2000
      });
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

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-400" />;
      case 'dropped':
        return <AlertTriangle className="h-5 w-5 text-orange-400" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: TransactionStatus): string => {
    switch (status) {
      case 'confirmed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      case 'dropped':
        return 'text-orange-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBadgeVariant = (status: TransactionStatus) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'failed':
      case 'dropped':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatElapsedTime = (startTime: number): string => {
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const chainConfig = getChainConfig(chainId);
  const monitoringResult = monitoredTx?.result;
  const transaction = monitoringResult?.transaction;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 mb-4">
          Transaction Monitor
        </Badge>
        <h3 className="text-xl font-bold text-honey mb-2">Real-Time Transaction Tracking</h3>
        <p className="text-muted-foreground">
          Monitor transaction status and confirmations across blockchains
        </p>
      </div>

      {/* Input Form */}
      <Card className="border-honey/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-honey" />
            Transaction Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="txHash">Transaction Hash</Label>
            <div className="flex gap-2">
              <Input
                id="txHash"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
                className="flex-1 font-mono text-sm"
                disabled={monitoredTx?.isActive}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(txHash, "Transaction hash")}
                disabled={!txHash}
                className="px-3"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chainId">Chain ID</Label>
              <Input
                id="chainId"
                type="number"
                value={chainId}
                onChange={(e) => setChainId(Number(e.target.value))}
                disabled={monitoredTx?.isActive}
                className="w-full"
              />
              {chainConfig && (
                <p className="text-xs text-muted-foreground">
                  {chainConfig.name} • {chainConfig.symbol}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmations">Required Confirmations</Label>
              <Input
                id="confirmations"
                type="number"
                value={requiredConfirmations}
                onChange={(e) => setRequiredConfirmations(Number(e.target.value))}
                min="1"
                max="50"
                disabled={monitoredTx?.isActive}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: {transactionMonitor.getRecommendedConfirmations(chainId)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {!monitoredTx?.isActive ? (
              <Button
                onClick={startMonitoring}
                disabled={isLoading || !txHash || !chainId}
                className="flex-1 bg-green-600 hover:bg-green-600/90 text-white"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Activity className="mr-2 h-4 w-4" />
                    Start Monitoring
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={stopMonitoring}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Stop Monitoring
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Results */}
      {monitoredTx && (
        <Card className={`border-2 ${
          transaction?.status === 'confirmed' 
            ? 'border-green-500/20 bg-green-500/5'
            : transaction?.status === 'failed'
            ? 'border-red-500/20 bg-red-500/5'
            : transaction?.status === 'pending'
            ? 'border-yellow-500/20 bg-yellow-500/5'
            : 'border-muted'
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {transaction ? getStatusIcon(transaction.status) : <Activity className="h-5 w-5" />}
              Monitoring Status
              {monitoredTx.isActive && (
                <Badge variant="outline" className="ml-auto bg-green-500/10 text-green-400 border-green-500/30">
                  <Activity className="mr-1 h-3 w-3" />
                  Active
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-honey mb-1">
                  {formatElapsedTime(monitoredTx.startTime)}
                </div>
                <div className="text-sm text-muted-foreground">Elapsed Time</div>
              </div>

              <div className="text-center">
                <div className={`text-2xl font-bold mb-1 ${transaction ? getStatusColor(transaction.status) : 'text-muted-foreground'}`}>
                  {transaction?.confirmations || 0} / {requiredConfirmations}
                </div>
                <div className="text-sm text-muted-foreground">Confirmations</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-honey mb-1">
                  {monitoringResult?.progress?.toFixed(0) || 0}%
                </div>
                <div className="text-sm text-muted-foreground">Progress</div>
              </div>
            </div>

            {/* Progress Bar */}
            {monitoringResult && (
              <div className="space-y-2">
                <Progress 
                  value={monitoringResult.progress || 0} 
                  className="h-3"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Confirmation Progress</span>
                  <span>{monitoringResult.progress?.toFixed(1) || 0}%</span>
                </div>
              </div>
            )}

            {/* Transaction Details */}
            {transaction && (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Status</span>
                    <Badge variant={getStatusBadgeVariant(transaction.status)}>
                      {getStatusIcon(transaction.status)}
                      <span className="ml-2 capitalize">{transaction.status}</span>
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Block Number</span>
                    <span className="font-mono">
                      {transaction.blockNumber || 'Pending'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">Transaction Hash</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(transaction.hash, "Transaction hash")}
                          className="p-2"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {chainConfig && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`${chainConfig.explorerUrl}/tx/${transaction.hash}`, '_blank')}
                            className="p-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                      {transaction.hash}
                    </code>
                  </div>

                  {transaction.gasUsed && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Gas Used</span>
                      <span className="font-mono">
                        {parseInt(transaction.gasUsed).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {transaction.timestamp && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Timestamp</span>
                      <span>
                        {new Date(transaction.timestamp).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Error Display */}
            {monitoringResult?.error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Monitoring Error</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {monitoringResult.error}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Information */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="space-y-2 text-sm">
              <div className="font-medium text-blue-400">How Transaction Monitoring Works</div>
              <ul className="text-muted-foreground space-y-1">
                <li>• Real-time monitoring checks transaction status every 10 seconds</li>
                <li>• Confirmations are counted from the current block height</li>
                <li>• Monitoring automatically stops when target confirmations are reached</li>
                <li>• Failed or dropped transactions are detected and reported</li>
                <li>• All monitoring data is stored for audit and debugging purposes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
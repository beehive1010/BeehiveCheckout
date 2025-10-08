import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { 
  feeCalculationEngine,
  type FeeCalculationOptions,
  type FeeCalculationResult 
} from '../../lib/web3/fee-calculation-engine';
import { getSupportedPaymentChains } from '../../lib/web3/multi-chain-config';
import {
  Calculator,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Zap,
  Network,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  Lightbulb
} from 'lucide-react';

interface FeeCalculatorDisplayProps {
  onFeeCalculated?: (result: FeeCalculationResult) => void;
  initialAmount?: number;
  initialSourceChain?: number;
  initialTargetChain?: number;
  className?: string;
}

export function FeeCalculatorDisplay({
  onFeeCalculated,
  initialAmount = 100,
  initialSourceChain = 42161, // Arbitrum
  initialTargetChain,
  className = ""
}: FeeCalculatorDisplayProps) {
  // Form state
  const [options, setOptions] = useState<FeeCalculationOptions>({
    transactionType: 'withdrawal',
    amount: initialAmount,
    sourceChainId: initialSourceChain,
    targetChainId: initialTargetChain,
    priority: 'standard',
    includeApproval: false
  });

  // UI state
  const [feeResult, setFeeResult] = useState<FeeCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [autoCalculate, setAutoCalculate] = useState(true);

  const supportedChains = getSupportedPaymentChains().filter(chain => !chain.isTestnet);

  // Auto-calculate when options change
  useEffect(() => {
    if (autoCalculate && options.amount > 0) {
      const debounce = setTimeout(() => {
        calculateFees();
      }, 500);
      return () => clearTimeout(debounce);
    }
  }, [options, autoCalculate]);

  const calculateFees = async () => {
    if (options.amount <= 0) return;

    setIsCalculating(true);
    
    try {
      const result = await feeCalculationEngine.calculateFees(options);
      setFeeResult(result);
      
      if (onFeeCalculated) {
        onFeeCalculated(result);
      }
    } catch (error) {
      console.error('Fee calculation failed:', error);
      setFeeResult({
        success: false,
        breakdown: {
          networkFee: {
            gasLimit: 0,
            gasPrice: 0,
            gasPriceGwei: 0,
            feeInNative: '0',
            feeInUSD: 0
          },
          platformFee: {
            rate: 0,
            amount: 0,
            feeInUSD: 0
          }
        },
        estimatedTime: {
          minutes: 0,
          confirmationBlocks: 0
        },
        error: error instanceof Error ? error.message : 'Calculation failed'
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const getUrgencyColor = (urgency: 'low' | 'medium' | 'high'): string => {
    switch (urgency) {
      case 'low':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getUrgencyIcon = (urgency: 'low' | 'medium' | 'high') => {
    switch (urgency) {
      case 'low':
        return <TrendingDown className="h-4 w-4 text-green-400" />;
      case 'medium':
        return <TrendingUp className="h-4 w-4 text-yellow-400" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
    }
  };

  const getPriorityLabel = (priority: 'slow' | 'standard' | 'fast'): string => {
    switch (priority) {
      case 'slow':
        return '🐢 Slow';
      case 'fast':
        return '⚡ Fast';
      default:
        return '⚖️ Standard';
    }
  };

  const sourceChain = supportedChains.find(c => c.chainId === options.sourceChainId);
  const targetChain = supportedChains.find(c => c.chainId === options.targetChainId);
  const isCrossChain = options.targetChainId && options.sourceChainId !== options.targetChainId;

  let urgencyLevel: 'low' | 'medium' | 'high' = 'low';
  if (feeResult?.success && feeResult.fees) {
    urgencyLevel = feeCalculationEngine.getFeeUrgencyLevel(
      feeResult.fees.totalFee, 
      options.amount
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 mb-4">
          Real-Time Fee Calculator
        </Badge>
        <h3 className="text-xl font-bold text-honey mb-2">Transaction Fee Estimator</h3>
        <p className="text-muted-foreground">
          Get accurate fee estimates with real-time network data
        </p>
      </div>

      {/* Input Configuration */}
      <Card className="border-honey/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-honey" />
            Transaction Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Transaction Amount (USD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                value={options.amount}
                onChange={(e) => setOptions(prev => ({ ...prev, amount: Number(e.target.value) }))}
                className="pl-10"
                min="1"
                max="100000"
                step="0.01"
                placeholder="100.00"
              />
            </div>
          </div>

          <Separator />

          {/* Transaction Type */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <Select 
              value={options.transactionType} 
              onValueChange={(value: any) => setOptions(prev => ({ ...prev, transactionType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="withdrawal">💸 Withdrawal</SelectItem>
                <SelectItem value="transfer">💰 Transfer</SelectItem>
                <SelectItem value="bridge">🌉 Bridge</SelectItem>
                <SelectItem value="swap">🔄 Swap</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source Chain */}
          <div className="space-y-2">
            <Label>Source Chain</Label>
            <Select 
              value={options.sourceChainId.toString()} 
              onValueChange={(value) => setOptions(prev => ({ ...prev, sourceChainId: Number(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedChains.map((chain) => (
                  <SelectItem key={chain.chainId} value={chain.chainId.toString()}>
                    <div className="flex items-center gap-2">
                      <i className={`${chain.icon} ${chain.color}`} />
                      {chain.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Chain (for bridge/cross-chain) */}
          {(options.transactionType === 'bridge' || isCrossChain) && (
            <div className="space-y-2">
              <Label>Target Chain</Label>
              <Select 
                value={options.targetChainId?.toString() || ""} 
                onValueChange={(value) => setOptions(prev => ({ 
                  ...prev, 
                  targetChainId: value ? Number(value) : undefined 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target chain" />
                </SelectTrigger>
                <SelectContent>
                  {supportedChains.map((chain) => (
                    <SelectItem key={chain.chainId} value={chain.chainId.toString()}>
                      <div className="flex items-center gap-2">
                        <i className={`${chain.icon} ${chain.color}`} />
                        {chain.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority Selection */}
          <div className="space-y-3">
            <Label>Transaction Priority</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['slow', 'standard', 'fast'] as const).map((priority) => (
                <Button
                  key={priority}
                  variant={options.priority === priority ? "default" : "outline"}
                  onClick={() => setOptions(prev => ({ ...prev, priority }))}
                  className={`${options.priority === priority ? 'bg-honey text-black' : ''}`}
                >
                  {getPriorityLabel(priority)}
                </Button>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeApproval"
                checked={options.includeApproval}
                onChange={(e) => setOptions(prev => ({ ...prev, includeApproval: e.target.checked }))}
              />
              <Label htmlFor="includeApproval">Include token approval fee</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoCalculate"
                checked={autoCalculate}
                onChange={(e) => setAutoCalculate(e.target.checked)}
              />
              <Label htmlFor="autoCalculate">Auto-calculate on changes</Label>
            </div>
          </div>

          {/* Manual Calculate Button */}
          {!autoCalculate && (
            <Button
              onClick={calculateFees}
              disabled={isCalculating || options.amount <= 0}
              className="w-full bg-blue-500 hover:bg-blue-500/90 text-white"
            >
              {isCalculating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate Fees
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Fee Results */}
      {feeResult && (
        <Card className={`border-2 ${
          feeResult.success 
            ? urgencyLevel === 'high' 
              ? 'border-red-500/20 bg-red-500/5'
              : 'border-green-500/20 bg-green-500/5'
            : 'border-destructive/20 bg-destructive/5'
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {feeResult.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  Fee Calculation Results
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Calculation Failed
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {feeResult.success && feeResult.fees ? (
              <>
                {/* Fee Summary */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      {getUrgencyIcon(urgencyLevel)}
                      Total Transaction Cost
                    </h4>
                    <div className={`text-2xl font-bold ${getUrgencyColor(urgencyLevel)}`}>
                      ${feeResult.fees.totalFee.toFixed(2)}
                    </div>
                  </div>

                  <Progress 
                    value={(feeResult.fees.totalFee / options.amount) * 100} 
                    className="h-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {((feeResult.fees.totalFee / options.amount) * 100).toFixed(1)}% of transaction amount
                  </p>
                </div>

                {/* Fee Breakdown */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Fee Breakdown</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Network className="h-4 w-4 text-blue-400" />
                        <span>Network Fee</span>
                        {sourceChain && <Badge variant="outline" className="text-xs">{sourceChain.name}</Badge>}
                      </div>
                      <span className="font-medium">${feeResult.breakdown.networkFee.feeInUSD.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-honey" />
                        <span>Platform Fee (0.5%)</span>
                      </div>
                      <span className="font-medium">${feeResult.breakdown.platformFee.feeInUSD.toFixed(2)}</span>
                    </div>

                    {feeResult.breakdown.bridgeFee && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-purple-400" />
                          <span>Bridge Fee</span>
                          {targetChain && (
                            <Badge variant="outline" className="text-xs">
                              to {targetChain.name}
                            </Badge>
                          )}
                        </div>
                        <span className="font-medium">${feeResult.breakdown.bridgeFee.feeInUSD.toFixed(2)}</span>
                      </div>
                    )}

                    {feeResult.breakdown.approval && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span>Token Approval</span>
                        </div>
                        <span className="font-medium">${feeResult.breakdown.approval.feeInUSD.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center font-semibold">
                    <span>Total Cost</span>
                    <span className="text-lg">${feeResult.fees.totalFee.toFixed(2)}</span>
                  </div>
                </div>

                {/* Timing Information */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-honey" />
                    <span className="font-medium">Estimated Processing Time</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Time: ~{feeResult.estimatedTime.minutes} minutes</p>
                    <p>Confirmations: {feeResult.estimatedTime.confirmationBlocks} blocks</p>
                  </div>
                </div>

                {/* Recommendations */}
                {feeResult.recommendations && feeResult.recommendations.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-honey" />
                      <span className="font-medium">Recommendations</span>
                    </div>
                    <div className="space-y-2">
                      {feeResult.recommendations.map((rec, index) => (
                        <div key={index} className="bg-honey/10 border border-honey/20 rounded p-3">
                          <p className="text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-destructive font-medium">Calculation Failed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {feeResult.error || 'Unknown error occurred'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading.tsx State */}
      {isCalculating && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
              <span className="text-blue-400 font-medium">
                Calculating fees with real-time network data...
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Coins, AlertTriangle, CheckCircle } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { useWallet } from '../../hooks/useWallet';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    id: string;
    title: string;
    priceBCC: number;
    priceUSDT?: number;
  };
  userBalance: {
    bcc_balance: number;
    usdt_balance: number;
  };
  onConfirmPayment: (paymentMethod: 'bcc' | 'blockchain') => Promise<void>;
}

export default function PaymentConfirmationModal({
  isOpen,
  onClose,
  course,
  userBalance,
  onConfirmPayment
}: PaymentConfirmationModalProps) {
  const { t } = useI18n();
  const { walletAddress } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'bcc' | 'blockchain'>('bcc');

  const handleConfirmPayment = async () => {
    try {
      setIsProcessing(true);
      await onConfirmPayment(paymentMethod);
      onClose();
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const hasEnoughBCC = userBalance.bcc_balance >= course.priceBCC;
  const remainingBalance = userBalance.bcc_balance - course.priceBCC;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-honey" />
            {t('education.payment.confirm_title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Course Information */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">{t('education.payment.course_details')}</h4>
            <p className="font-medium">{course.title}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('education.payment.price')}</span>
              <Badge variant="outline" className="text-honey font-medium">
                {course.priceBCC} BCC
              </Badge>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">{t('education.payment.method')}</h4>
            
            {/* BCC Balance Payment */}
            <div 
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                paymentMethod === 'bcc' 
                  ? 'border-honey bg-honey/10' 
                  : 'border-border hover:border-honey/50'
              }`}
              onClick={() => setPaymentMethod('bcc')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    paymentMethod === 'bcc' ? 'border-honey bg-honey' : 'border-muted-foreground'
                  }`}>
                    {paymentMethod === 'bcc' && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                  <span className="font-medium">BCC {t('education.payment.balance')}</span>
                </div>
                <Badge variant={hasEnoughBCC ? 'default' : 'destructive'}>
                  {userBalance.bcc_balance} BCC
                </Badge>
              </div>
              
              {paymentMethod === 'bcc' && (
                <div className="mt-2 text-sm">
                  {hasEnoughBCC ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>
                        {t('education.payment.sufficient_balance')} 
                        ({remainingBalance} BCC {t('education.payment.remaining')})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{t('education.payment.insufficient_balance')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Blockchain Payment (Future) */}
            <div 
              className={`border rounded-lg p-3 cursor-pointer transition-colors opacity-50 ${
                paymentMethod === 'blockchain' 
                  ? 'border-honey bg-honey/10' 
                  : 'border-border hover:border-honey/50'
              }`}
              onClick={() => setPaymentMethod('blockchain')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    paymentMethod === 'blockchain' ? 'border-honey bg-honey' : 'border-muted-foreground'
                  }`}>
                    {paymentMethod === 'blockchain' && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                  <span className="font-medium">{t('education.payment.blockchain')}</span>
                </div>
                <Badge variant="outline">
                  {t('education.payment.coming_soon')}
                </Badge>
              </div>
              
              {paymentMethod === 'blockchain' && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {t('education.payment.blockchain_description')}
                </div>
              )}
            </div>
          </div>

          {/* Wallet Information */}
          <div className="bg-muted/20 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('education.payment.wallet')}</span>
              <span className="font-mono text-xs">
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '--'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleConfirmPayment}
              disabled={isProcessing || (paymentMethod === 'bcc' && !hasEnoughBCC) || paymentMethod === 'blockchain'}
              className="flex-1 bg-honey hover:bg-honey/90 text-black"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('education.payment.processing')}
                </>
              ) : (
                t('education.payment.confirm')
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
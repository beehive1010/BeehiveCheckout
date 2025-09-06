import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import ClaimMembershipButton from './membership/ClaimMembershipButton';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../hooks/use-toast';

interface ActivationScreenProps {
  walletAddress: string;
}

export function ActivationScreen({ walletAddress }: ActivationScreenProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  const benefits = [
    { icon: 'fas fa-graduation-cap', text: 'Web3 Learning Courses' },
    { icon: 'fas fa-coins', text: 'BCC Token Rewards' },
    { icon: 'fas fa-users', text: 'Referral Matrix System' },
    { icon: 'fas fa-shopping-bag', text: 'NFT Marketplace Access' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-2xl mx-auto">
        <Card className="bg-secondary border-honey/30 shadow-2xl backdrop-blur mx-2 sm:mx-0">
          <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-honey/20 to-honey/10 flex items-center justify-center">
              <i className="fas fa-crown text-honey text-2xl sm:text-3xl"></i>
            </div>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-honey mb-2 sm:mb-3">
              Premium Membership
            </CardTitle>
            <p className="text-muted-foreground text-base sm:text-lg px-2">
              Activate your existing Level 1 NFT in the system to access all features.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6 sm:space-y-8 px-4 sm:px-6">
            {/* NFT Status Card */}
            <div className="bg-gradient-to-r from-green-500/5 via-green-500/10 to-green-500/5 rounded-xl p-4 sm:p-6 border border-green-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-check text-green-500 text-lg sm:text-xl"></i>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-green-500">Level 1 NFT Detected</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">NFT found in your wallet</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs sm:text-sm text-muted-foreground">Token ID</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-500">0</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
                <span className="text-green-500 font-medium">✓ NFT Ownership Verified</span>
                <span className="text-muted-foreground">Ready for Activation</span>
              </div>
            </div>

            {/* Benefits Grid */}
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-honey mb-4 sm:mb-6 text-center">What You'll Unlock:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-honey/20 flex items-center justify-center flex-shrink-0">
                      <i className={`${benefit.icon} text-honey text-sm`}></i>
                    </div>
                    <span className="text-sm font-medium">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activation Button */}
            <div className="text-center space-y-3 sm:space-y-4">
              <ClaimMembershipButton
                walletAddress={walletAddress}
                level={1}
                onSuccess={() => {
                  toast({
                    title: t('dashboard.activation.success.title'),
                    description: t('dashboard.activation.success.description'),
                  });
                  window.location.reload();
                }}
                onError={(error) => {
                  toast({
                    title: t('dashboard.activation.error.title'),
                    description: error || t('dashboard.activation.error.description'),
                    variant: 'destructive',
                  });
                }}
                className="w-full h-11 sm:h-12 text-base sm:text-lg font-semibold bg-gradient-to-r from-honey to-yellow-400 hover:from-yellow-400 hover:to-honey text-black transition-all duration-300 shadow-lg hover:shadow-honey/25"
              />
              <p className="text-xs sm:text-sm text-muted-foreground px-2">
                {t('dashboard.activation.activationNote')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
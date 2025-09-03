import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import ClaimMembershipButton from '../membership/ClaimMembershipButton';
import { useI18n } from '../../contexts/I18nContext';
import { useToast } from '../../hooks/use-toast';

interface NFTRequiredScreenProps {
  walletAddress: string;
}

export function NFTRequiredScreen({ walletAddress }: NFTRequiredScreenProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-secondary border-border shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-honey mb-2">
              {t('dashboard.nftRequired.title')}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {t('dashboard.nftRequired.description')}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* NFT Section */}
            <div className="bg-muted rounded-lg p-4 border border-honey/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-honey">{t('dashboard.nftRequired.requiredNft')}</h3>
                  <p className="text-xs text-muted-foreground">{t('dashboard.nftRequired.nftDescription')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t('dashboard.nftRequired.price')}</p>
                  <p className="text-xl font-bold text-honey">{t('dashboard.nftRequired.priceAmount')}</p>
                </div>
              </div>
              <div className="flex items-center text-xs">
                <i className="fas fa-layer-group text-honey mr-2"></i>
                <span className="text-honey font-medium">{t('dashboard.nftRequired.tokenId')}</span>
              </div>
            </div>

            {/* Benefits Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-honey">{t('dashboard.nftRequired.benefitsTitle')}</h3>
              <div className="space-y-2">
                {[
                  'dashboard', 'tasks', 'education', 'discover', 'tokens', 'matrix'
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center text-sm">
                    <div className="w-4 h-4 rounded-full bg-honey/20 flex items-center justify-center mr-3">
                      <i className="fas fa-check text-honey text-xs"></i>
                    </div>
                    <span className="text-muted-foreground">{t(`dashboard.nftRequired.benefits.${benefit}`)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Section */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <i className="fas fa-gem text-honey mr-2"></i>
                <span className="text-honey font-medium text-sm">{t('dashboard.nftRequired.premiumTitle')}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.nftRequired.premiumDescription')}
              </p>

              <ClaimMembershipButton
                walletAddress={walletAddress}
                level={1}
                onSuccess={() => {
                  toast({
                    title: t('dashboard.nftRequired.purchaseSuccess.title'),
                    description: t('dashboard.nftRequired.purchaseSuccess.description'),
                  });
                  window.location.reload();
                }}
                onError={(error) => {
                  toast({
                    title: t('dashboard.nftRequired.purchaseError.title'),
                    description: error || t('dashboard.nftRequired.purchaseError.description'),
                    variant: 'destructive',
                  });
                }}
                className="w-full"
              />

              <p className="text-xs text-muted-foreground">
                {t('dashboard.nftRequired.supportText')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
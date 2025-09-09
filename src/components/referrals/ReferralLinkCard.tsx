import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Share2, Copy } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { useToast } from '../../hooks/use-toast';
import { dashboardService } from '../../api/dashboard/dashboard.client';

interface ReferralLinkCardProps {
  walletAddress: string;
}

export function ReferralLinkCard({ walletAddress }: ReferralLinkCardProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [showReferralLink, setShowReferralLink] = useState(false);
  
  const referralLink = dashboardService.generateReferralLink(walletAddress);
  const socialUrls = dashboardService.generateSocialShareUrls(referralLink);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: t('dashboard.referralLink.copied'),
      description: t('dashboard.referralLink.copiedDesc'),
    });
  };

  const shareToSocial = (platform: 'twitter' | 'telegram' | 'whatsapp') => {
    window.open(socialUrls[platform], '_blank');
  };

  return (
    <Card className="bg-secondary border-border glow-hover mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-honey flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {t('dashboard.referralLink.title')}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReferralLink(!showReferralLink)}
          >
            {showReferralLink ? t('dashboard.referralLink.hide') : t('dashboard.referralLink.show')}
          </Button>
        </div>
        
        {showReferralLink && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input 
                value={referralLink}
                readOnly
                className="bg-muted"
                data-testid="input-referral-link"
              />
              <Button
                onClick={copyToClipboard}
                size="sm"
                data-testid="button-copy-referral"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => shareToSocial('twitter')}
                size="sm"
                variant="outline"
                className="flex-1 min-w-0"
                data-testid="button-share-twitter"
              >
                <i className="fab fa-twitter mr-1 sm:mr-2"></i> 
                <span className="truncate">{t('dashboard.social.twitter')}</span>
              </Button>
              <Button
                onClick={() => shareToSocial('telegram')}
                size="sm"
                variant="outline"
                className="flex-1 min-w-0"
                data-testid="button-share-telegram"
              >
                <i className="fab fa-telegram mr-1 sm:mr-2"></i> 
                <span className="truncate">{t('dashboard.social.telegram')}</span>
              </Button>
              <Button
                onClick={() => shareToSocial('whatsapp')}
                size="sm"
                variant="outline"
                className="flex-1 min-w-0"
                data-testid="button-share-whatsapp"
              >
                <i className="fab fa-whatsapp mr-1 sm:mr-2"></i> 
                <span className="truncate">{t('dashboard.social.whatsapp')}</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
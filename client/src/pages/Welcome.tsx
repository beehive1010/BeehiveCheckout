import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useLocation } from 'wouter';
import { CheckCircle, Users, Gift } from 'lucide-react';

export default function Welcome() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-lg bg-secondary border-border">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-honey rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-secondary" />
          </div>
          <CardTitle className="text-honey text-2xl">
            {t('welcome.title') || 'Welcome to BeeHive!'}
          </CardTitle>
          <p className="text-muted-foreground">
            {t('welcome.subtitle') || 'Your journey in the hive begins now'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <Users className="w-6 h-6 text-honey mx-auto mb-2" />
              <p className="text-sm font-semibold">{t('welcome.community') || 'Join Community'}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <Gift className="w-6 h-6 text-honey mx-auto mb-2" />
              <p className="text-sm font-semibold">{t('welcome.rewards') || 'Earn Rewards'}</p>
            </div>
          </div>
          <Button
            onClick={() => setLocation('/dashboard')}
            className="w-full bg-honey text-secondary hover:bg-honey/90"
          >
            {t('welcome.continue') || 'Continue to Dashboard'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
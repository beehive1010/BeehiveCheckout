import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';
import { useLocation } from 'wouter';

export default function Registration() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleRegistration = async () => {
    setIsLoading(true);
    try {
      // Registration logic would go here
      toast({
        title: t('registration.success') || 'Registration Successful',
        description: t('registration.successDesc') || 'Welcome to BeeHive!',
      });
      setLocation('/welcome');
    } catch (error) {
      toast({
        title: t('registration.error') || 'Registration Failed',
        description: t('registration.errorDesc') || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey text-center">
            {t('registration.title') || 'Join BeeHive'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder={t('registration.walletPlaceholder') || 'Wallet Address'}
            className="bg-muted border-border"
          />
          <Button
            onClick={handleRegistration}
            disabled={isLoading}
            className="w-full bg-honey text-secondary hover:bg-honey/90"
          >
            {isLoading ? t('registration.loading') || 'Registering...' : t('registration.register') || 'Register'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
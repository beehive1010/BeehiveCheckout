import { Card, CardContent } from '../ui/card';
import { useI18n } from '../../contexts/I18nContext';

export function LoadingScreen() {
  const { t } = useI18n();

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto bg-secondary border-border">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('dashboard.verifying')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
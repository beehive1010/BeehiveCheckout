import { useI18n } from '../../contexts/I18nContext';
import HexagonIcon from '../UI/HexagonIcon';

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="bg-secondary border-t border-border mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <HexagonIcon className="w-8 h-8">
                <i className="fas fa-layer-group text-honey text-xs"></i>
              </HexagonIcon>
              <h3 className="text-honey font-bold">Beehive</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              {t('footer.description')}
            </p>
          </div>
          
          <div>
            <h4 className="text-honey font-semibold mb-3">{t('footer.support')}</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li><a href="#" className="hover:text-honey transition-colors">{t('footer.helpCenter')}</a></li>
              <li><a href="#" className="hover:text-honey transition-colors">{t('footer.documentation')}</a></li>
              <li><a href="#" className="hover:text-honey transition-colors">{t('footer.contact')}</a></li>
              <li><a href="#" className="hover:text-honey transition-colors">{t('footer.status')}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-honey font-semibold mb-3">{t('footer.legal')}</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li><a href="#" className="hover:text-honey transition-colors">{t('footer.privacy')}</a></li>
              <li><a href="#" className="hover:text-honey transition-colors">{t('footer.terms')}</a></li>
              <li><a href="#" className="hover:text-honey transition-colors">{t('footer.cookies')}</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground text-sm">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}

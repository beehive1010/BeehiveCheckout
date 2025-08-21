import { useLocation } from 'wouter';
import { Link } from 'wouter';
import { useI18n } from '../../contexts/I18nContext';
import { useWallet } from '../../hooks/useWallet';

interface TabItem {
  key: string;
  path: string;
  icon: string;
  labelKey: string;
}

const tabItems: TabItem[] = [
  { key: 'dashboard', path: '/dashboard', icon: 'fas fa-home', labelKey: 'nav.dashboard' },
  { key: 'tasks', path: '/tasks', icon: 'fas fa-store', labelKey: 'nav.marketplace' },
  { key: 'education', path: '/education', icon: 'fas fa-graduation-cap', labelKey: 'nav.education' },
  { key: 'hiveworld', path: '/hiveworld', icon: 'fas fa-sitemap', labelKey: 'nav.hiveworld' },
  { key: 'me', path: '/me', icon: 'fas fa-user', labelKey: 'nav.me' },
];

export default function TabBar() {
  const { isActivated } = useWallet();
  const { t } = useI18n();
  const [location] = useLocation();

  // Only show TabBar for activated members
  if (!isActivated) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-secondary/95 backdrop-blur-sm border-t border-border">
        <div className="grid grid-cols-5 h-16">
          {tabItems.map((item) => {
            const isActive = location === item.path;
            
            return (
              <Link 
                key={item.key} 
                href={item.path}
                data-testid={`tab-${item.key}`}
              >
                <button
                  className={`
                    w-full h-full flex flex-col items-center justify-center transition-all duration-200
                    ${isActive 
                      ? 'text-honey bg-honey/10' 
                      : 'text-muted-foreground hover:text-honey hover:bg-honey/5'
                    }
                  `}
                >
                  <div className="relative">
                    <i className={`${item.icon} text-lg mb-1`}></i>
                    {isActive && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-honey rounded-full"></div>
                    )}
                  </div>
                  <span className="text-xs font-medium leading-none">
                    {String(t(item.labelKey))}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
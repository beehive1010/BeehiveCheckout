import { useLocation } from 'wouter';
import { Link } from 'wouter';
import { useI18n } from '../../contexts/I18nContext';
import { useWallet } from '../../hooks/useWallet';
import HexagonIcon from './HexagonIcon';
import { useEffect } from 'react';

interface TabItem {
  key: string;
  path: string;
  icon: string;
  labelKey: string;
}

const tabItems: TabItem[] = [
  { key: 'tasks', path: '/tasks', icon: 'fas fa-store', labelKey: 'nav.marketplace' },
  { key: 'education', path: '/education', icon: 'fas fa-graduation-cap', labelKey: 'nav.education' },
  { key: 'home', path: '/dashboard', icon: '', labelKey: 'nav.home' }, // Special home tab with logo
  { key: 'discover', path: '/discover', icon: 'fas fa-compass', labelKey: 'nav.discover' },
];

export default function TabBar() {
  const { isActivated, walletAddress } = useWallet();
  const { t } = useI18n();
  const [location, setLocation] = useLocation();

  // Auto redirect to landing page when wallet disconnects
  useEffect(() => {
    if (!walletAddress && location !== '/') {
      setLocation('/');
    }
  }, [walletAddress, location, setLocation]);

  // Hide TabBar on landing page and for non-activated members
  if (!isActivated || location === '/') {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-secondary/95 backdrop-blur-sm border-t border-border">
        <div className="grid grid-cols-4 h-20">
          {tabItems.map((item, index) => {
            const isActive = location === item.path;
            const isHomeTab = item.key === 'home';
            
            return (
              <Link 
                key={item.key} 
                href={item.path}
                data-testid={`tab-${item.key}`}
              >
                <button
                  className={`
                    w-full h-full flex flex-col items-center justify-center transition-all duration-200 relative
                    ${isActive 
                      ? 'text-honey bg-honey/10' 
                      : 'text-muted-foreground hover:text-honey hover:bg-honey/5'
                    }
                    ${isHomeTab ? 'transform -translate-y-2' : ''}
                  `}
                >
                  {isHomeTab ? (
                    // Special home tab with hexagon logo
                    <div className="relative">
                      <div className={`
                        p-3 rounded-full transition-all duration-200
                        ${isActive 
                          ? 'bg-honey/20 shadow-lg shadow-honey/25' 
                          : 'bg-secondary border border-border hover:bg-honey/10'
                        }
                      `}>
                        <HexagonIcon className="w-6 h-6">
                          <i className="fas fa-layer-group text-honey text-sm"></i>
                        </HexagonIcon>
                      </div>
                      {isActive && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-honey rounded-full animate-pulse"></div>
                      )}
                      <span className="text-xs font-medium leading-none mt-1 block">
                        {String(t(item.labelKey))}
                      </span>
                    </div>
                  ) : (
                    // Regular tabs
                    <>
                      <div className="relative">
                        <i className={`${item.icon} text-lg mb-1`}></i>
                        {isActive && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-honey rounded-full"></div>
                        )}
                      </div>
                      <span className="text-xs font-medium leading-none">
                        {String(t(item.labelKey))}
                      </span>
                    </>
                  )}
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
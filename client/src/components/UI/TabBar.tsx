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
      {/* Mobile TabBar with modern design */}
      <div className="bg-background/95 backdrop-blur-lg border-t border-border/50 shadow-lg shadow-black/10">
        {/* Safe area for iPhone notch */}
        <div className="pb-safe">
          <div className="grid grid-cols-4 h-16 px-2">
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
                      w-full h-full flex flex-col items-center justify-center transition-all duration-300 relative
                      ${isActive 
                        ? '' 
                        : 'hover:scale-105 active:scale-95'
                      }
                    `}
                  >
                    {isHomeTab ? (
                      // Special elevated home tab
                      <div className="relative flex flex-col items-center">
                        <div className={`
                          relative p-3 rounded-2xl transition-all duration-300 transform
                          ${isActive 
                            ? 'bg-honey shadow-lg shadow-honey/30 -translate-y-2 scale-110' 
                            : 'bg-secondary/80 border border-border/50 hover:bg-honey/10 hover:-translate-y-1'
                          }
                        `}>
                          <HexagonIcon className={`transition-all duration-300 ${isActive ? 'w-7 h-7' : 'w-6 h-6'}`}>
                            <i className={`fas fa-layer-group transition-colors duration-300 ${isActive ? 'text-black' : 'text-honey'}`}></i>
                          </HexagonIcon>
                          
                          {/* Active indicator ring */}
                          {isActive && (
                            <div className="absolute inset-0 rounded-2xl border-2 border-honey/50 animate-pulse"></div>
                          )}
                        </div>
                        
                        <span className={`
                          text-xs font-semibold mt-1 transition-all duration-300
                          ${isActive ? 'text-honey scale-105' : 'text-muted-foreground'}
                        `}>
                          {String(t(item.labelKey))}
                        </span>
                      </div>
                    ) : (
                      // Regular tabs with modern styling
                      <div className="flex flex-col items-center relative">
                        <div className={`
                          relative p-2 rounded-xl transition-all duration-300
                          ${isActive 
                            ? 'bg-honey/15 scale-110' 
                            : 'hover:bg-honey/5'
                          }
                        `}>
                          <i className={`
                            ${item.icon} text-xl transition-all duration-300
                            ${isActive 
                              ? 'text-honey drop-shadow-sm' 
                              : 'text-muted-foreground'
                            }
                          `}></i>
                          
                          {/* Active indicator dot */}
                          {isActive && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-honey rounded-full animate-pulse shadow-sm shadow-honey/50"></div>
                          )}
                        </div>
                        
                        <span className={`
                          text-xs font-medium mt-1 transition-all duration-300
                          ${isActive 
                            ? 'text-honey font-semibold' 
                            : 'text-muted-foreground'
                          }
                        `}>
                          {String(t(item.labelKey))}
                        </span>
                        
                        {/* Active bottom indicator */}
                        {isActive && (
                          <div className="absolute -bottom-1 w-1 h-1 bg-honey rounded-full"></div>
                        )}
                      </div>
                    )}
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
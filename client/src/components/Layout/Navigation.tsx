import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Link } from 'wouter';

interface NavItem {
  key: string;
  path: string;
  icon: string;
  labelKey: string;
}

const navItems: NavItem[] = [
  { key: 'dashboard', path: '/dashboard', icon: 'fas fa-home', labelKey: 'nav.dashboard' },
  { key: 'tasks', path: '/tasks', icon: 'fas fa-tasks', labelKey: 'nav.tasks' },
  { key: 'education', path: '/education', icon: 'fas fa-graduation-cap', labelKey: 'nav.education' },
  { key: 'discover', path: '/discover', icon: 'fas fa-compass', labelKey: 'nav.discover' },
  { key: 'hiveworld', path: '/hiveworld', icon: 'fas fa-sitemap', labelKey: 'nav.hiveworld' },
  { key: 'me', path: '/me', icon: 'fas fa-user', labelKey: 'nav.me' },
];

export default function Navigation() {
  const { isActivated } = useWallet();
  const { t } = useI18n();
  const [location] = useLocation();

  // Only show navigation for activated members
  if (!isActivated) {
    return null;
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-secondary border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location === item.path;
              
              return (
                <Link 
                  key={item.key} 
                  href={item.path}
                  data-testid={`link-${item.key}`}
                >
                  <button
                    className={`
                      tab-btn flex-shrink-0 px-6 py-4 transition-colors border-b-2
                      ${isActive 
                        ? 'border-honey text-honey' 
                        : 'border-transparent text-muted-foreground hover:bg-muted hover:text-honey'
                      }
                    `}
                  >
                    <i className={`${item.icon} mr-2`}></i>
                    {String(t(item.labelKey))}
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-secondary border-b border-border">
        <div className="px-4 py-2">
          <div className="grid grid-cols-3 gap-1">
            {navItems.map((item, index) => {
              const isActive = location === item.path;
              
              return (
                <div key={item.key}>
                  <Link href={item.path} data-testid={`link-mobile-${item.key}`}>
                    <button
                      className={`
                        w-full py-3 px-2 rounded-lg transition-colors text-xs
                        ${isActive 
                          ? 'bg-honey/20 text-honey border border-honey/30' 
                          : 'text-muted-foreground hover:bg-muted hover:text-honey'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center space-y-1">
                        <i className={`${item.icon} text-sm`}></i>
                        <span className="truncate">{String(t(item.labelKey))}</span>
                      </div>
                    </button>
                  </Link>
                  {/* Add divider after every 3rd item */}
                  {(index + 1) % 3 === 0 && index < navItems.length - 1 && (
                    <div className="col-span-3 my-2">
                      <div className="h-px bg-border"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

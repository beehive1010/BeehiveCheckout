import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Link } from 'wouter';
import TabBar from '../UI/TabBar';

interface NavItem {
  key: string;
  path: string;
  icon: string;
  labelKey: string;
}

const navItems: NavItem[] = [
  { key: 'dashboard', path: '/dashboard', icon: 'fas fa-home', labelKey: 'nav.dashboard' },
  { key: 'tasks', path: '/tasks', icon: 'fas fa-store', labelKey: 'nav.marketplace' },
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

      {/* Mobile TabBar Navigation */}
      <TabBar />
    </>
  );
}

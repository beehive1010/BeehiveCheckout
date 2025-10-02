import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Link } from 'wouter';
import TabBar from './TabBar';

interface NavItem {
  key: string;
  path: string;
  icon: string;
  labelKey: string;
}

const navItems: NavItem[] = [
  { key: 'tasks', path: '/tasks', icon: 'fas fa-layer-group', labelKey: 'nav.tasks' },
  { key: 'education', path: '/education', icon: 'fas fa-graduation-cap', labelKey: 'nav.education' },
  { key: 'dashboard', path: '/dashboard', icon: 'fas fa-home', labelKey: 'nav.dashboard' },
  { key: 'referrals', path: '/referrals', icon: 'fas fa-users', labelKey: 'nav.referrals' },
  { key: 'hiveworld', path: '/hiveworld', icon: 'fas fa-globe', labelKey: 'nav.hiveworld' },
];

export default function Navigation() {
  const { walletAddress } = useWallet();
  const { t } = useI18n();
  const [location] = useLocation();

  // Show navigation for users with connected wallets (not just activated)
  if (!walletAddress) {
    return null;
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-secondary border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-nowrap overflow-x-auto scrollbar-hide">
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
                      tab-btn flex-shrink-0 px-6 py-4 transition-colors border-b-2 whitespace-nowrap
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

import React from 'react';
import { Link } from 'wouter';
import { Home, Users, GraduationCap, Gift, TrendingUp } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';

export function MatrixBottomNav() {
  const { t } = useI18n();
  
  const navItems = [
    {
      icon: Home,
      label: t('matrix.navigation.home'),
      href: '/',
      section: '#hero'
    },
    {
      icon: Users,
      label: t('matrix.navigation.features'),
      href: '/',
      section: '#features'
    },
    {
      icon: TrendingUp,
      label: t('matrix.navigation.howItWorks'),
      href: '/',
      section: '#how-it-works'
    },
    {
      icon: GraduationCap,
      label: t('matrix.navigation.education'),
      href: '/',
      section: '#education'
    },
    {
      icon: Gift,
      label: t('matrix.navigation.getStarted'),
      href: '/',
      section: '#cta'
    }
  ];

  const handleNavClick = (href: string, section: string) => {
    // Navigate to landing page
    window.location.href = href + section;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 z-50">
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => handleNavClick(item.href, item.section)}
              className="flex flex-col items-center justify-center py-2 px-2 text-gray-400 hover:text-honey transition-colors min-h-[60px] text-xs"
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MatrixBottomNav;
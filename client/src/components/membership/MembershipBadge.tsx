import { getMembershipLevel } from '../../lib/config/membershipLevels';
import HexagonIcon from '../UI/HexagonIcon';

interface MembershipBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  className?: string;
}

const getBadgeStyles = (badgeTheme: string, level: number) => {
  const baseStyles = "relative overflow-hidden";
  
  switch (badgeTheme) {
    case 'bronze':
      return `${baseStyles} bg-gradient-to-br from-orange-600 to-amber-700 shadow-lg shadow-orange-500/25`;
    case 'bronze-plus':
      return `${baseStyles} bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-400/30`;
    case 'silver':
      return `${baseStyles} bg-gradient-to-br from-slate-400 to-gray-500 shadow-lg shadow-slate-400/25`;
    case 'silver-plus':
      return `${baseStyles} bg-gradient-to-br from-slate-300 to-gray-400 shadow-lg shadow-slate-300/30`;
    case 'gold':
      return `${baseStyles} bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-400/25`;
    case 'gold-plus':
      return `${baseStyles} bg-gradient-to-br from-yellow-300 to-amber-400 shadow-lg shadow-yellow-300/30`;
    case 'platinum':
      return `${baseStyles} bg-gradient-to-br from-slate-200 to-zinc-300 shadow-lg shadow-slate-200/25`;
    case 'platinum-plus':
      return `${baseStyles} bg-gradient-to-br from-slate-100 to-zinc-200 shadow-lg shadow-slate-100/30`;
    case 'diamond':
      return `${baseStyles} bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-400/25`;
    case 'diamond-plus':
      return `${baseStyles} bg-gradient-to-br from-cyan-300 to-blue-400 shadow-lg shadow-cyan-300/30`;
    case 'cosmic':
      return `${baseStyles} bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/25`;
    case 'cosmic-plus':
      return `${baseStyles} bg-gradient-to-br from-purple-400 to-pink-500 shadow-lg shadow-purple-400/30`;
    case 'ethereal':
      return `${baseStyles} bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25`;
    case 'ethereal-plus':
      return `${baseStyles} bg-gradient-to-br from-indigo-400 to-purple-500 shadow-lg shadow-indigo-400/30`;
    case 'divine':
      return `${baseStyles} bg-gradient-to-br from-rose-400 to-pink-500 shadow-lg shadow-rose-400/25`;
    case 'divine-plus':
      return `${baseStyles} bg-gradient-to-br from-rose-300 to-pink-400 shadow-lg shadow-rose-300/30`;
    case 'transcendent':
      return `${baseStyles} bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-400/25`;
    case 'transcendent-plus':
      return `${baseStyles} bg-gradient-to-br from-emerald-300 to-teal-400 shadow-lg shadow-emerald-300/30`;
    case 'mythical':
      return `${baseStyles} bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-lg shadow-violet-500/25 animate-pulse`;
    default:
      return `${baseStyles} bg-gradient-to-br from-honey to-amber-500 shadow-lg shadow-honey/25`;
  }
};

const getSizeStyles = (size: string) => {
  switch (size) {
    case 'sm':
      return 'w-8 h-8';
    case 'md':
      return 'w-12 h-12';
    case 'lg':
      return 'w-16 h-16';
    case 'xl':
      return 'w-20 h-20';
    default:
      return 'w-12 h-12';
  }
};

const getIconSize = (size: string) => {
  switch (size) {
    case 'sm':
      return 'text-xs';
    case 'md':
      return 'text-sm';
    case 'lg':
      return 'text-base';
    case 'xl':
      return 'text-lg';
    default:
      return 'text-sm';
  }
};

const getLevelIcon = (level: number): string => {
  if (level <= 3) return 'fas fa-shield';
  if (level <= 6) return 'fas fa-crown';
  if (level <= 9) return 'fas fa-star';
  if (level <= 12) return 'fas fa-gem';
  if (level <= 15) return 'fas fa-fire';
  if (level <= 18) return 'fas fa-lightning';
  return 'fas fa-infinity';
};

export default function MembershipBadge({ 
  level, 
  size = 'md', 
  showLabel = false, 
  className = '' 
}: MembershipBadgeProps) {
  const membershipLevel = getMembershipLevel(level);
  
  if (!membershipLevel) {
    return null;
  }

  const badgeStyles = getBadgeStyles(membershipLevel.badgeTheme, level);
  const sizeStyles = getSizeStyles(size);
  const iconSize = getIconSize(size);
  const levelIcon = getLevelIcon(level);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`${badgeStyles} ${sizeStyles} rounded-2xl flex items-center justify-center relative`}>
        {/* Hexagon background pattern */}
        <div className="absolute inset-0 opacity-20">
          <HexagonIcon className="w-full h-full">
            <i className="fas fa-layer-group text-white/30"></i>
          </HexagonIcon>
        </div>
        
        {/* Level icon */}
        <i className={`${levelIcon} ${iconSize} text-white drop-shadow-md z-10`}></i>
        
        {/* Level number */}
        <div className="absolute -bottom-1 -right-1 bg-black/80 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border border-white/20">
          {level}
        </div>
        
        {/* Shine effect for higher levels */}
        {level >= 15 && (
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent rounded-2xl animate-pulse"></div>
        )}
      </div>
      
      {showLabel && (
        <span className="text-xs font-medium text-center mt-1 text-muted-foreground">
          L{level}
        </span>
      )}
    </div>
  );
}
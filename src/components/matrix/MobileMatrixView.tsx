import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Users,
  User,
  ChevronLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Crown,
  Home,
  Search,
  Filter,
  X
} from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { useIsMobile } from '../../hooks/use-mobile';
import { useMatrixNodeChildren, useMatrixGlobalSearch, MatrixTreeNode } from '../../hooks/useMatrixTreeData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface MobileMatrixViewProps {
  rootWalletAddress: string;
  rootUser?: { username: string; currentLevel: number };
  onNavigateToMember?: (memberWallet: string) => void;
}

interface NavigationHistory {
  wallet: string;
  username?: string;
  level: number;
  layer: number;
}

interface MatrixNodeProps {
  position: string;
  member: {
    wallet: string;
    joinedAt: string;
    type: string;
    username?: string;
    isActivated?: boolean;
    level?: number;
    layer?: number;  // Matrix layer position
    hasChildInL?: boolean;
    hasChildInM?: boolean;
    hasChildInR?: boolean;
    childCountL?: number;
    childCountM?: number;
    childCountR?: number;
  } | null;
  onTap?: (memberWallet: string) => void;
}

const MatrixNode: React.FC<MatrixNodeProps> = ({ position, member, onTap }) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();

  // 移动端优化的尺寸
  const nodeSize = isMobile ? 'p-2' : 'p-3';
  const iconSize = isMobile ? 'w-3 h-3' : 'w-4 h-4';
  const avatarSize = isMobile ? 'w-6 h-6' : 'w-8 h-8';
  const textSize = isMobile ? 'text-[10px]' : 'text-xs';

  if (!member) {
    return (
      <div className={`aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center ${nodeSize} transition-all`}>
        <div className={`${avatarSize} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-1`}>
          <User className={`${iconSize} text-gray-400`} />
        </div>
        <div className={`${textSize} font-semibold text-gray-500 dark:text-gray-400 mb-1`}>{position}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500">{t('matrix.waitingToJoin')}</div>
      </div>
    );
  }

  const isSpillover = member.type === 'is_spillover' || member.type !== 'is_direct';
  const avatarColors = isSpillover
    ? 'from-amber-500 to-yellow-600'
    : 'from-yellow-500 to-amber-600';

  const memberAvatarSize = isMobile ? 'w-8 h-8' : 'w-10 h-10';
  const badgeSize = isMobile ? 'text-[10px] h-4 px-1.5' : 'text-xs h-4 px-2';

  return (
    <div
      className={`aspect-square bg-gradient-to-br ${
        isSpillover
          ? 'from-amber-500/20 to-yellow-500/30 border-amber-500/50'
          : 'from-yellow-500/20 to-amber-500/30 border-yellow-500/50'
      } border-2 rounded-xl ${nodeSize} flex flex-col items-center justify-center transition-all hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/20 active:scale-95 cursor-pointer bg-black/80 touch-manipulation gpu-accelerated`}
      onClick={() => onTap?.(member.wallet)}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = 'scale(0.95)';
        e.currentTarget.style.borderColor = 'rgba(250, 204, 21, 0.7)';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.borderColor = '';
      }}
    >
      {/* Avatar */}
      <div className={`${memberAvatarSize} rounded-full bg-gradient-to-br ${avatarColors} flex items-center justify-center mb-1 shadow-lg`}>
        <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>
          {member.username?.charAt(0).toUpperCase() || member.wallet.charAt(2).toUpperCase()}
        </span>
      </div>

      {/* Position Badge */}
      <div className={`${textSize} font-bold text-gray-700 dark:text-gray-300 mb-0.5`}>{position}</div>

      {/* Type Indicator */}
      <div className="flex items-center mb-0.5">
        {isSpillover ? (
          <ArrowDownLeft className={`${iconSize} text-blue-400 dark:text-blue-400`} />
        ) : (
          <ArrowUpRight className={`${iconSize} text-green-600 dark:text-green-400`} />
        )}
      </div>

      {/* Username */}
      <div className={`${textSize} font-medium text-gray-800 dark:text-gray-200 text-center truncate w-full px-0.5`}>
        {member.username || `${t('common.user')}${member.wallet.slice(-4)}`}
      </div>

      {/* Wallet Address - Mobile Optimized */}
      <div className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} text-gray-600 dark:text-gray-400 font-mono text-center truncate w-full px-0.5`}>
        {member.wallet.slice(0, 6)}...{member.wallet.slice(-4)}
      </div>

      {/* Level & Layer Badges */}
      <div className="flex items-center gap-1 mt-0.5 flex-wrap justify-center">
        {member.level && (
          <Badge className={`${badgeSize} ${
            isSpillover
              ? 'bg-blue-400 hover:bg-blue-500'
              : 'bg-green-500 hover:bg-green-600'
          }`}>
            L{member.level}
          </Badge>
        )}
        {member.layer && (
          <Badge variant="outline" className={`${badgeSize} bg-yellow-500/10 text-yellow-400 border-yellow-500/50`}>
            Layer {member.layer}
          </Badge>
        )}
      </div>

      {/* Next Level Indicators - 移动端优化 */}
      <div className={`flex justify-center ${isMobile ? 'space-x-1 mt-1' : 'space-x-2 mt-2'}`}>
        <div className={`flex flex-col items-center ${isMobile ? 'space-y-0' : 'space-y-1'} ${member.hasChildInL ? 'text-green-400' : 'text-gray-400'}`}>
          <div className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full ${member.hasChildInL ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className={`${isMobile ? 'text-[8px]' : 'text-xs'} font-medium`}>{t('membershipSystem.matrix.drillDown.positions.left')}</span>
        </div>
        <div className={`flex flex-col items-center ${isMobile ? 'space-y-0' : 'space-y-1'} ${member.hasChildInM ? 'text-green-400' : 'text-gray-400'}`}>
          <div className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full ${member.hasChildInM ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className={`${isMobile ? 'text-[8px]' : 'text-xs'} font-medium`}>{t('membershipSystem.matrix.drillDown.positions.middle')}</span>
        </div>
        <div className={`flex flex-col items-center ${isMobile ? 'space-y-0' : 'space-y-1'} ${member.hasChildInR ? 'text-green-400' : 'text-gray-400'}`}>
          <div className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full ${member.hasChildInR ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className={`${isMobile ? 'text-[8px]' : 'text-xs'} font-medium`}>{t('membershipSystem.matrix.drillDown.positions.right')}</span>
        </div>
      </div>
    </div>
  );
};

const MobileMatrixView: React.FC<MobileMatrixViewProps> = ({
  rootWalletAddress,
  rootUser,
  onNavigateToMember
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [currentRoot, setCurrentRoot] = useState<string>(rootWalletAddress);
  const [currentNodeLayer, setCurrentNodeLayer] = useState<number>(1); // Track actual node layer
  const [navigationHistory, setNavigationHistory] = useState<NavigationHistory[]>([]);
  const [currentRootUser, setCurrentRootUser] = useState(rootUser);
  const [originalRoot] = useState<string>(rootWalletAddress);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all'); // all, direct, spillover
  const [filterLayer, setFilterLayer] = useState<string>('all'); // all, 1, 2, ... 19
  const [filterLevel, setFilterLevel] = useState<string>('all'); // all, 1, 2, ... 19
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Use new unified hook for children data
  const { data: childrenData, isLoading, error } = useMatrixNodeChildren(
    originalRoot,
    currentRoot
  );

  // Global search hook - searches all 19 layers
  const { data: globalSearchResults, isLoading: isSearching } = useMatrixGlobalSearch(
    originalRoot,
    searchQuery
  );

  console.log('🔍 MobileMatrixView - Current state:', {
    currentRoot,
    currentNodeLayer,
    originalRoot,
    isLoading,
    error: error?.message,
    childrenData: childrenData ? 'Data available' : 'No data'
  });

  const handleMemberTap = (memberWallet: string) => {
    console.log('🔍 MobileMatrixView - Tapping member:', memberWallet);
    console.log('🔍 Current root before change:', currentRoot);

    // Find which child was clicked to get its layer
    const childNode = childrenData?.L?.member_wallet === memberWallet ? childrenData.L :
                     childrenData?.M?.member_wallet === memberWallet ? childrenData.M :
                     childrenData?.R?.member_wallet === memberWallet ? childrenData.R :
                     null;

    const nextLayer = childNode?.layer || currentNodeLayer + 1;

    console.log('🔍 Child node data:', childNode);
    console.log('🔍 Next layer will be:', nextLayer);

    // 保存当前根到历史记录
    setNavigationHistory(prev => [...prev, {
      wallet: currentRoot,
      username: currentRootUser?.username || `${t('common.user')}${currentRoot.slice(-4)}`,
      level: navigationHistory.length + 1,
      layer: currentNodeLayer  // Save current node layer
    }]);

    // 切换到新的根，更新到实际的 layer
    setCurrentRoot(memberWallet);
    setCurrentNodeLayer(nextLayer);  // Update to next node's layer
    setCurrentRootUser({
      username: `${t('common.user')}${memberWallet.slice(-4)}`,
      currentLevel: 1
    });

    console.log('🔍 New root set to:', memberWallet);
    console.log('🔍 New node layer set to:', nextLayer);

    // 如果有外部导航处理器，也调用它
    onNavigateToMember?.(memberWallet);
  };

  const handleGoBack = () => {
    if (navigationHistory.length > 0) {
      const previous = navigationHistory[navigationHistory.length - 1];
      setCurrentRoot(previous.wallet);
      setCurrentNodeLayer(previous.layer);  // Restore previous node layer
      setCurrentRootUser({
        username: previous.username || `${t('common.user')}${previous.wallet.slice(-4)}`,
        currentLevel: 1
      });
      setNavigationHistory(prev => prev.slice(0, -1));
    }
  };

  const handleGoHome = () => {
    setCurrentRoot(rootWalletAddress);
    setCurrentNodeLayer(1);  // Reset to layer 1
    setCurrentRootUser(rootUser);
    setNavigationHistory([]);
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className={isMobile ? "p-4" : "p-6"}>
          <div className={`text-center ${isMobile ? 'py-8' : 'py-12'}`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-gradient-to-br from-honey to-honey/80 mx-auto mb-4 flex items-center justify-center animate-pulse`}>
              <Users className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
            </div>
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-yellow-200 dark:text-yellow-300`}>{t('matrix.loadingData')}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className={isMobile ? "p-4" : "p-6"}>
          <div className={`text-center ${isMobile ? 'py-8' : 'py-12'}`}>
            <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4 flex items-center justify-center`}>
              <User className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-red-500`} />
            </div>
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-red-400 dark:text-red-300 mb-2`}>{t('matrix.loadFailed')}</div>
            <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 dark:text-gray-400`}>{error.message}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No need for separate no-data check - childrenData can be null/empty
  // The component will handle it by showing empty slots

  // Transform childrenData to match expected structure
  const currentMatrix = [];
  let totalMembers = 0;

  if (childrenData) {
    // Transform L, M, R positions into array format
    if (childrenData.L) {
      currentMatrix.push({
        position: 'L',
        member: {
          wallet: childrenData.L.member_wallet,
          username: childrenData.L.username,
          level: childrenData.L.level,
          layer: childrenData.L.layer,  // ✅ Include layer info
          joinedAt: childrenData.L.joined_at || '',
          type: childrenData.L.referral_type === 'direct' ? 'is_direct' : 'is_spillover',
          isActivated: true,
          hasChildInL: childrenData.L.child_count_l > 0,
          hasChildInM: childrenData.L.child_count_m > 0,
          hasChildInR: childrenData.L.child_count_r > 0,
          childCountL: childrenData.L.child_count_l,
          childCountM: childrenData.L.child_count_m,
          childCountR: childrenData.L.child_count_r
        }
      });
      totalMembers++;
    }

    if (childrenData.M) {
      currentMatrix.push({
        position: 'M',
        member: {
          wallet: childrenData.M.member_wallet,
          username: childrenData.M.username,
          level: childrenData.M.level,
          layer: childrenData.M.layer,  // ✅ Include layer info
          joinedAt: childrenData.M.joined_at || '',
          type: childrenData.M.referral_type === 'direct' ? 'is_direct' : 'is_spillover',
          isActivated: true,
          hasChildInL: childrenData.M.child_count_l > 0,
          hasChildInM: childrenData.M.child_count_m > 0,
          hasChildInR: childrenData.M.child_count_r > 0,
          childCountL: childrenData.M.child_count_l,
          childCountM: childrenData.M.child_count_m,
          childCountR: childrenData.M.child_count_r
        }
      });
      totalMembers++;
    }

    if (childrenData.R) {
      currentMatrix.push({
        position: 'R',
        member: {
          wallet: childrenData.R.member_wallet,
          username: childrenData.R.username,
          level: childrenData.R.level,
          layer: childrenData.R.layer,  // ✅ Include layer info
          joinedAt: childrenData.R.joined_at || '',
          type: childrenData.R.referral_type === 'direct' ? 'is_direct' : 'is_spillover',
          isActivated: true,
          hasChildInL: childrenData.R.child_count_l > 0,
          hasChildInM: childrenData.R.child_count_m > 0,
          hasChildInR: childrenData.R.child_count_r > 0,
          childCountL: childrenData.R.child_count_l,
          childCountM: childrenData.R.child_count_m,
          childCountR: childrenData.R.child_count_r
        }
      });
      totalMembers++;
    }

    console.log('✅ Transformed childrenData:', { currentMatrix, totalMembers });
  }

  console.log('🔍 MobileMatrixView - Matrix data details:', {
    hasChildrenData: !!childrenData,
    currentMatrix,
    totalMembers,
    currentMatrixLength: currentMatrix.length,
    currentRoot
  });

  // Apply search and filter
  const filteredMatrix = useMemo(() => {
    if (!currentMatrix || currentMatrix.length === 0) return currentMatrix;

    return currentMatrix.filter(node => {
      if (!node.member) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const username = node.member.username?.toLowerCase() || '';
        const wallet = node.member.wallet.toLowerCase();

        if (!username.includes(query) && !wallet.includes(query)) {
          return false;
        }
      }

      // Type filter
      if (filterType !== 'all') {
        const isDirect = node.member.type === 'is_direct';
        if (filterType === 'direct' && !isDirect) return false;
        if (filterType === 'spillover' && isDirect) return false;
      }

      // Layer filter
      if (filterLayer !== 'all') {
        const layer = node.member.layer;
        if (String(layer) !== filterLayer) return false;
      }

      // Level filter
      if (filterLevel !== 'all') {
        const level = node.member.level;
        if (String(level) !== filterLevel) return false;
      }

      return true;
    });
  }, [currentMatrix, searchQuery, filterType, filterLayer, filterLevel]);

  const hasActiveFilters = searchQuery || filterType !== 'all' || filterLayer !== 'all' || filterLevel !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterLayer('all');
    setFilterLevel('all');
  };

  return (
    <div className={isMobile ? "space-y-3" : "space-y-4"}>
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-500/40 shadow-xl shadow-yellow-500/20">
        <CardHeader className={isMobile ? "pb-2" : "pb-3"}>
          <CardTitle className={`flex items-center justify-between ${isMobile ? 'text-base' : 'text-lg'}`}>
            <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-2'}`}>
              <Crown className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-yellow-400`} />
              <span className="text-yellow-400 dark:text-yellow-300">{t('matrix.matrixView')}</span>
            </div>
            <Badge className={`bg-yellow-500 text-black font-semibold ${isMobile ? 'text-xs px-2 py-0.5' : ''}`}>
              {t('matrix.layer')} {currentNodeLayer}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Search and Filter Card */}
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className={isMobile ? "p-3" : "p-4"}>
          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-gray-400`} />
            <Input
              type="text"
              placeholder={t('matrix.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${isMobile ? 'pl-9 h-9 text-sm' : 'pl-11 h-10'} bg-black/50 border-yellow-500/30 text-white placeholder:text-gray-400 focus:border-yellow-500`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className={isMobile ? 'w-4 h-4' : 'w-5 h-5'} />
              </button>
            )}
          </div>

          {/* Global Search Results */}
          {searchQuery && globalSearchResults && globalSearchResults.length > 0 && (
            <div className={`${isMobile ? 'mb-3' : 'mb-4'} border border-yellow-500/30 rounded-lg bg-black/30 ${isMobile ? 'p-2' : 'p-3'}`}>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-yellow-300 mb-2`}>
                Found {globalSearchResults.length} member{globalSearchResults.length > 1 ? 's' : ''} across all layers
              </div>
              <div className={`space-y-2 max-h-[300px] overflow-y-auto ${isMobile ? 'text-xs' : 'text-sm'}`}>
                {globalSearchResults.map((node) => (
                  <div
                    key={node.member_wallet}
                    onClick={() => {
                      // Navigate to this member
                      setCurrentRoot(node.member_wallet);
                      setCurrentNodeLayer(node.layer);
                      setSearchQuery(''); // Clear search after navigation
                    }}
                    className="flex items-center justify-between p-2 bg-yellow-500/10 hover:bg-yellow-500/20 rounded border border-yellow-500/30 cursor-pointer transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-yellow-200">
                          {node.member_username || `User${node.member_wallet.slice(-4)}`}
                        </span>
                        <Badge className={`${isMobile ? 'text-[9px] h-4' : 'text-xs'} ${node.referral_type === 'direct' ? 'bg-green-500' : 'bg-blue-400'}`}>
                          {node.referral_type === 'direct' ? t('matrix.directReferral') : t('matrix.spillover')}
                        </Badge>
                      </div>
                      <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400 font-mono mt-0.5`}>
                        {formatWallet(node.member_wallet)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`${isMobile ? 'text-[9px]' : 'text-xs'} bg-yellow-500/10 text-yellow-400 border-yellow-500/50`}>
                        {t('matrix.layer')} {node.layer}
                      </Badge>
                      <Badge variant="outline" className={`${isMobile ? 'text-[9px]' : 'text-xs'} bg-purple-500/10 text-purple-400 border-purple-500/50`}>
                        {node.slot}
                      </Badge>
                      <Badge className={`${isMobile ? 'text-[9px]' : 'text-xs'} bg-amber-500`}>
                        L{node.member_level}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Toggle Button */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 ${isMobile ? 'h-8 text-xs' : 'h-9'} bg-black/50 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10`}
            >
              <Filter className={`${isMobile ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-2'}`} />
              {t('matrix.filters')}
              {hasActiveFilters && (
                <Badge className="ml-2 bg-yellow-500 text-black px-1.5 py-0">
                  {[searchQuery ? 1 : 0, filterType !== 'all' ? 1 : 0, filterLayer !== 'all' ? 1 : 0, filterLevel !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)}
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className={`${isMobile ? 'h-8 px-2 text-xs' : 'h-9 px-3'} text-red-400 hover:text-red-300 hover:bg-red-500/10`}
              >
                <X className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
              </Button>
            )}
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className={`${isMobile ? 'mt-3 space-y-2' : 'mt-4 space-y-3'} pt-3 border-t border-yellow-500/20`}>
              {/* Type Filter */}
              <div>
                <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-yellow-300 mb-1.5`}>
                  {t('matrix.filterByType')}
                </label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className={`${isMobile ? 'h-9 text-xs' : 'h-10'} bg-black/50 border-yellow-500/30 text-white`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-yellow-500/30">
                    <SelectItem value="all" className="text-white hover:bg-yellow-500/10">
                      {t('matrix.filterAll')}
                    </SelectItem>
                    <SelectItem value="direct" className="text-white hover:bg-yellow-500/10">
                      {t('matrix.directReferral')}
                    </SelectItem>
                    <SelectItem value="spillover" className="text-white hover:bg-yellow-500/10">
                      {t('matrix.spillover')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Layer Filter */}
              <div>
                <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-yellow-300 mb-1.5`}>
                  {t('matrix.filterByLayer')}
                </label>
                <Select value={filterLayer} onValueChange={setFilterLayer}>
                  <SelectTrigger className={`${isMobile ? 'h-9 text-xs' : 'h-10'} bg-black/50 border-yellow-500/30 text-white`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-yellow-500/30 max-h-[300px] overflow-y-auto">
                    <SelectItem value="all" className="text-white hover:bg-yellow-500/10">
                      {t('matrix.filterAll')}
                    </SelectItem>
                    {Array.from({ length: 19 }, (_, i) => i + 1).map(layer => (
                      <SelectItem key={layer} value={String(layer)} className="text-white hover:bg-yellow-500/10">
                        {t('matrix.layer')} {layer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Level Filter */}
              <div>
                <label className={`block ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-yellow-300 mb-1.5`}>
                  {t('matrix.filterByLevel')}
                </label>
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger className={`${isMobile ? 'h-9 text-xs' : 'h-10'} bg-black/50 border-yellow-500/30 text-white`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-yellow-500/30 max-h-[300px] overflow-y-auto">
                    <SelectItem value="all" className="text-white hover:bg-yellow-500/10">
                      {t('matrix.filterAll')}
                    </SelectItem>
                    {Array.from({ length: 19 }, (_, i) => i + 1).map(level => (
                      <SelectItem key={level} value={String(level)} className="text-white hover:bg-yellow-500/10">
                        {t('matrix.level')} {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Active Filter Summary */}
          {hasActiveFilters && !showFilters && (
            <div className={`${isMobile ? 'mt-2 text-xs' : 'mt-3 text-sm'} text-yellow-200/70 flex items-center flex-wrap gap-1`}>
              <span>{t('matrix.activeFilters')}:</span>
              {searchQuery && (
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
                  "{searchQuery}"
                </Badge>
              )}
              {filterType !== 'all' && (
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
                  {filterType === 'direct' ? t('matrix.directReferral') : t('matrix.spillover')}
                </Badge>
              )}
              {filterLayer !== 'all' && (
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
                  {t('matrix.layer')} {filterLayer}
                </Badge>
              )}
              {filterLevel !== 'all' && (
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
                  {t('matrix.level')} {filterLevel}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Root User Info Card */}
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className={isMobile ? "p-3" : "p-4"}>
          {/* Navigation Controls */}
          <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-4'}`}>
            <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
              {navigationHistory.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoBack}
                  className={`text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/10 bg-black/20 ${isMobile ? 'h-8 px-2 text-xs' : ''}`}
                >
                  <ChevronLeft className={`${isMobile ? 'h-3 w-3 mr-0.5' : 'h-4 w-4 mr-1'}`} />
                  {isMobile ? t('common.back') : t('matrix.previousLayer')}
                </Button>
              )}

              {currentRoot !== rootWalletAddress && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoHome}
                  className={`text-amber-400 border-amber-500/50 hover:bg-amber-500/10 bg-black/20 ${isMobile ? 'h-8 px-2 text-xs' : ''}`}
                >
                  <Home className={`${isMobile ? 'h-3 w-3 mr-0.5' : 'h-4 w-4 mr-1'}`} />
                  {isMobile ? 'Home' : t('matrix.myMatrix')}
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
              <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-gradient-to-br from-honey to-honey/80 flex items-center justify-center shadow-lg`}>
                <Crown className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-black`} />
              </div>
              <div>
                <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-900 dark:text-gray-100`}>
                  {currentRootUser?.username || t('matrix.myMatrix')}
                </div>
                <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-600 dark:text-gray-400 font-mono`}>
                  {formatWallet(currentRoot)}
                </div>
                {currentRootUser?.currentLevel && (
                  <Badge className={`mt-1 bg-honey text-black ${isMobile ? 'text-[10px] px-1.5 py-0' : 'text-xs'}`}>
                    {t('matrix.level')} {currentRootUser.currentLevel}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-honey`}>{totalMembers}/3</div>
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-yellow-200/60 dark:text-yellow-200/80`}>{t('matrix.filled')}</div>
            </div>
          </div>

          {/* Navigation History */}
          {navigationHistory.length > 0 && (
            <div className={`${isMobile ? 'mt-2 pt-2' : 'mt-3 pt-3'} border-t border-yellow-500/30`}>
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-yellow-400 mb-1`}>{t('matrix.navigationPath')}:</div>
              <div className={`flex items-center ${isMobile ? 'space-x-1 text-[10px]' : 'space-x-2 text-xs'}`}>
                <span className="text-yellow-300/70">{t('matrix.myMatrix')}</span>
                {navigationHistory.map((nav, index) => (
                  <React.Fragment key={index}>
                    <span className="text-yellow-400/60">→</span>
                    <span className="text-amber-400">{nav.username}</span>
                  </React.Fragment>
                ))}
                <span className="text-yellow-400/60">→</span>
                <span className="text-green-400 font-medium">{t('matrix.current')}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matrix Grid */}
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className={isMobile ? "p-4" : "p-6"}>
          {/* Filter Results Info */}
          {hasActiveFilters && (
            <div className={`${isMobile ? 'mb-3 text-xs' : 'mb-4 text-sm'} text-center text-yellow-300`}>
              {filteredMatrix.length === 0 ? (
                <span>{t('matrix.noResultsFound')}</span>
              ) : filteredMatrix.length < currentMatrix.length ? (
                <span>{t('matrix.showingResults', { count: filteredMatrix.length, total: currentMatrix.length })}</span>
              ) : (
                <span>{t('matrix.showingAllResults', { count: currentMatrix.length })}</span>
              )}
            </div>
          )}

          <div className={`grid grid-cols-3 ${isMobile ? 'gap-2 mb-4' : 'gap-4 mb-6'}`}>
            {['L', 'M', 'R'].map(position => {
              // Check if position exists in filtered results
              const node = filteredMatrix.find(n => n.position === position);
              const originalNode = currentMatrix.find(n => n.position === position);
              const isFiltered = originalNode && !node;

              return (
                <div key={position} className="relative">
                  <MatrixNode
                    position={position}
                    member={node?.member || null}
                    onTap={handleMemberTap}
                  />
                  {isFiltered && (
                    <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-yellow-300 text-center px-2`}>
                        <Filter className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mx-auto mb-1`} />
                        {t('matrix.filteredOut')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className={`grid grid-cols-3 ${isMobile ? 'gap-2 pt-3' : 'gap-3 pt-4'} border-t border-gray-100 dark:border-gray-800`}>
            <div className="text-center">
              <div className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-green-500`}>
                {hasActiveFilters ? filteredMatrix.filter(n => n.member?.type !== 'is_spillover').length : currentMatrix.filter(n => n.member?.type !== 'is_spillover').length}
              </div>
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-yellow-200/60 dark:text-yellow-200/80`}>{t('matrix.directReferral')}</div>
            </div>
            <div className="text-center">
              <div className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-blue-400`}>
                {hasActiveFilters ? filteredMatrix.filter(n => n.member?.type === 'is_spillover').length : currentMatrix.filter(n => n.member?.type === 'is_spillover').length}
              </div>
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-yellow-200/60 dark:text-yellow-200/80`}>{t('matrix.spillover')}</div>
            </div>
            <div className="text-center">
              <div className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-500`}>{3 - totalMembers}</div>
              <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-yellow-200/60 dark:text-yellow-200/80`}>{t('matrix.emptySlot')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-gray-50 dark:bg-gray-800/50 border-0">
        <CardContent className="p-4">
          <div className="text-sm font-medium text-yellow-400 dark:text-yellow-300 mb-3">{t('matrix.legend')}</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              <span className="text-yellow-200/80 dark:text-yellow-200/90"><strong>{t('matrix.directReferral')}</strong>: {t('matrix.directReferralDesc')}</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-3 w-3 text-blue-400" />
              <span className="text-yellow-200/80 dark:text-yellow-200/90"><strong>{t('matrix.spillover')}</strong>: {t('matrix.spilloverDesc')}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-gray-400" />
              <span className="text-yellow-200/80 dark:text-yellow-200/90"><strong>{t('matrix.emptySlot')}</strong>: {t('matrix.emptySlotDesc')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileMatrixView;
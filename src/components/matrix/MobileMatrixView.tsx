import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Users, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Crown,
  Layers
} from 'lucide-react';
import { useLayeredMatrix } from '../../hooks/useMatrixByLevel';
import { useI18n } from '../../contexts/I18nContext';

interface MobileMatrixViewProps {
  rootWalletAddress: string;
  rootUser?: { username: string; currentLevel: number };
  onNavigateToMember?: (memberWallet: string) => void;
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
  } | null;
  onTap?: (memberWallet: string) => void;
}

const MatrixNode: React.FC<MatrixNodeProps> = ({ position, member, onTap }) => {
  if (!member) {
    return (
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl flex flex-col items-center justify-center p-3 transition-all">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2">
          <User className="w-4 h-4 text-gray-400" />
        </div>
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{position}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500">{t('matrix.waitingToJoin')}</div>
      </div>
    );
  }

  const isSpillover = member.type === 'is_spillover' || member.type !== 'is_direct';
  const avatarColors = isSpillover 
    ? 'from-amber-500 to-yellow-600' 
    : 'from-yellow-500 to-amber-600';
  
  return (
    <div 
      className={`aspect-square bg-gradient-to-br ${
        isSpillover 
          ? 'from-amber-500/20 to-yellow-500/30 border-amber-500/50' 
          : 'from-yellow-500/20 to-amber-500/30 border-yellow-500/50'
      } border-2 rounded-2xl flex flex-col items-center justify-center p-3 transition-all hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/20 active:scale-95 cursor-pointer bg-black/80`}
      onClick={() => onTap?.(member.wallet)}
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors} flex items-center justify-center mb-2 shadow-lg`}>
        <span className="text-white font-bold text-sm">
          {member.username?.charAt(0).toUpperCase() || member.wallet.charAt(2).toUpperCase()}
        </span>
      </div>
      
      {/* Position Badge */}
      <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{position}</div>
      
      {/* Type Indicator */}
      <div className="flex items-center mb-1">
        {isSpillover ? (
          <ArrowDownLeft className="w-3 h-3 text-blue-400 dark:text-blue-400" />
        ) : (
          <ArrowUpRight className="w-3 h-3 text-green-600 dark:text-green-400" />
        )}
      </div>
      
      {/* Username */}
      <div className="text-xs font-medium text-gray-800 dark:text-gray-200 text-center truncate w-full px-1">
        {member.username || `User${member.wallet.slice(-4)}`}
      </div>
      
      {/* Level Badge */}
      {member.level && (
        <Badge className={`mt-1 text-xs h-4 px-2 ${
          isSpillover 
            ? 'bg-blue-400 hover:bg-blue-500' 
            : 'bg-green-500 hover:bg-green-600'
        }`}>
          L{member.level}
        </Badge>
      )}
    </div>
  );
};

const MobileMatrixView: React.FC<MobileMatrixViewProps> = ({
  rootWalletAddress,
  rootUser,
  onNavigateToMember
}) => {
  const { t } = useI18n();
  const [currentLayer, setCurrentLayer] = useState<number>(1);
  
  // 使用修正后的useLayeredMatrix hook，支持层级参数
  const { data: matrixData, isLoading, error } = useLayeredMatrix(rootWalletAddress, currentLayer);

  const handleMemberTap = (memberWallet: string) => {
    onNavigateToMember?.(memberWallet);
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-honey to-honey/80 mx-auto mb-4 flex items-center justify-center animate-pulse">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-sm text-yellow-200 dark:text-yellow-300">{t('matrix.loadingData')}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4 flex items-center justify-center">
              <User className="w-6 h-6 text-red-500" />
            </div>
            <div className="text-sm text-red-400 dark:text-red-300 mb-2">{t('matrix.loadFailed')}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{error.message}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!matrixData) {
    return (
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto mb-4 flex items-center justify-center">
              <Users className="w-6 h-6 text-gray-400" />
            </div>
            <div className="text-sm text-yellow-200 dark:text-yellow-300">{t('matrix.noData')}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentMatrix = matrixData.currentLayerMatrix || matrixData.layer1Matrix || [];
  const totalMembers = matrixData.totalCurrentLayerMembers || matrixData.totalLayer1Members || 0;

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-500/40 shadow-xl shadow-yellow-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 dark:text-yellow-300">{t('matrix.matrixView')}</span>
            </div>
            <Badge className="bg-yellow-500 text-black font-semibold">
              {t('matrix.layer')} {currentLayer}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Root User Info Card */}
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-honey to-honey/80 flex items-center justify-center shadow-lg">
                <Crown className="w-6 h-6 text-black" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {rootUser?.username || t('matrix.myMatrix')}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                  {formatWallet(rootWalletAddress)}
                </div>
                {rootUser?.currentLevel && (
                  <Badge className="mt-1 bg-honey text-black text-xs">
                    {t('matrix.level')} {rootUser.currentLevel}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-honey">{totalMembers}/3</div>
              <div className="text-xs text-yellow-200/60 dark:text-yellow-200/80">{t('matrix.filled')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layer Navigation */}
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentLayer(Math.max(1, currentLayer - 1))}
              disabled={currentLayer <= 1}
              className="h-10 px-4 border-gray-200 dark:border-gray-700"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('matrix.previousLayer')}
            </Button>
            
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-honey" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('matrix.layer')} {currentLayer}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentLayer(currentLayer + 1)}
              disabled={currentLayer >= 19}
              className="h-10 px-4 border-gray-200 dark:border-gray-700"
            >
              {t('matrix.nextLayer')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Quick Layer Selection */}
          <div className="flex flex-wrap gap-1 justify-center">
            {[1,2,3,4,5,6,7,8,9,10].map(layer => (
              <Button
                key={layer}
                variant={layer === currentLayer ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentLayer(layer)}
                className={`h-8 w-8 text-xs ${
                  layer === currentLayer
                    ? 'bg-honey text-black hover:bg-honey/90'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {layer}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Matrix Grid */}
      <Card className="bg-gradient-to-br from-black/90 to-gray-900/95 border border-yellow-500/30 shadow-xl shadow-yellow-500/10">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {['L', 'M', 'R'].map(position => {
              const node = currentMatrix.find(n => n.position === position);
              return (
                <MatrixNode
                  key={position}
                  position={position}
                  member={node?.member || null}
                  onTap={handleMemberTap}
                />
              );
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="text-center">
              <div className="text-lg font-bold text-green-500">{currentMatrix.filter(n => n.member?.type !== 'is_spillover').length}</div>
              <div className="text-xs text-yellow-200/60 dark:text-yellow-200/80">{t('matrix.directReferral')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{currentMatrix.filter(n => n.member?.type === 'is_spillover').length}</div>
              <div className="text-xs text-yellow-200/60 dark:text-yellow-200/80">{t('matrix.spillover')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-500">{3 - totalMembers}</div>
              <div className="text-xs text-yellow-200/60 dark:text-yellow-200/80">{t('matrix.emptySlot')}</div>
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
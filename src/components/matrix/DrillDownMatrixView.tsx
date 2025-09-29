import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ChevronDown, ChevronRight, Users, User, Trophy, ArrowLeft, Home } from 'lucide-react';
import { useLayeredMatrix, useMatrixChildren } from '../../hooks/useMatrixByLevel';
import { useI18n } from '../../contexts/I18nContext';

interface DrillDownMatrixViewProps {
  rootWalletAddress: string;
  rootUser?: { username: string; currentLevel: number };
}

interface MatrixNodeProps {
  position: string;
  member: {
    wallet: string;
    joinedAt: string;
    type: string;
    hasChildren?: boolean;
    childrenCount?: number;
  } | null;
  onExpand?: (memberWallet: string) => void;
  isExpanded?: boolean;
}

const MatrixNode: React.FC<MatrixNodeProps> = ({ 
  position, 
  member, 
  onExpand, 
  isExpanded = false 
}) => {
  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const getPositionIcon = (pos: string) => {
    switch(pos) {
      case 'L': return '👈';
      case 'M': return '🎯'; 
      case 'R': return '👉';
      default: return '📍';
    }
  };

  if (!member) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 min-h-[120px] flex items-center justify-center hover:border-muted-foreground/50 transition-colors bg-muted/20">
        <div className="text-center">
          <div className="text-2xl mb-2">{getPositionIcon(position)}</div>
          <div className="text-sm font-medium text-muted-foreground">{position}</div>
          <div className="text-xs text-muted-foreground/70 mt-1">{t('matrix.drillDown.emptySlot')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-border rounded-lg p-4 min-h-[120px] bg-gradient-to-br from-muted/30 to-muted/50 hover:from-muted/40 hover:to-muted/60 transition-all duration-200 shadow-sm hover:shadow-md">
      <div className="text-center">
        {/* Position Icon */}
        <div className="text-2xl mb-2">{getPositionIcon(position)}</div>
        
        {/* Position Label */}
        <div className="text-sm font-bold text-foreground mb-2">{position}</div>
        
        {/* Wallet Address */}
        <div className="text-xs text-muted-foreground mb-2 font-mono bg-background/50 px-2 py-1 rounded border border-border">
          {formatWallet(member.wallet)}
        </div>
        
        {/* Join Date */}
        <div className="text-xs text-muted-foreground/80 mb-2">
          {formatDate(member.joinedAt)}
        </div>
        
        {/* Member Type */}
        <Badge 
          variant={member.type === 'is_direct' ? 'default' : 'secondary'}
          className="text-xs mb-3"
        >
          {member.type === 'is_direct' ? t('matrix.drillDown.directReferral') : t('matrix.drillDown.spillover')}
        </Badge>
        
        {/* Expand Button */}
        {member.hasChildren && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExpand?.(member.wallet)}
            className="w-full text-xs mt-2 border-honey/30 text-honey hover:bg-honey hover:text-secondary"
          >
            {isExpanded ? (
              <>
                <ChevronDown size={14} className="mr-1" />
                {t('matrix.drillDown.collapse')} {t('matrix.drillDown.childrenCount', { count: member.childrenCount })}
              </>
            ) : (
              <>
                <ChevronRight size={14} className="mr-1" />
                {t('matrix.drillDown.expand')} {t('matrix.drillDown.childrenCount', { count: member.childrenCount })}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

const ChildrenMatrix: React.FC<{ 
  parentWallet: string; 
  matrixRootWallet: string; 
  onClose: () => void;
}> = ({ parentWallet, matrixRootWallet, onClose }) => {
  const { data: childrenData, isLoading, error } = useMatrixChildren(matrixRootWallet, parentWallet);

  if (isLoading) {
    return (
      <div className="mt-6 p-6 bg-gray-50 rounded-lg border">
        <div className="text-center text-gray-500 flex items-center justify-center">
          <User className="animate-spin mr-2" size={16} />
          {t('matrix.drillDown.loadingChildren')}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 p-6 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center text-red-500">{t('matrix.drillDown.loadingFailed')}: {error.message}</div>
      </div>
    );
  }

  if (!childrenData || childrenData.totalChildren === 0) {
    return (
      <div className="mt-6 p-6 bg-gray-50 rounded-lg border">
        <div className="text-center text-gray-500">{t('matrix.drillDown.noChildren')}</div>
      </div>
    );
  }

  return (
    <div className="mt-6 p-6 bg-gradient-to-r from-muted/20 to-muted/30 rounded-lg border border-border">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-honey flex items-center">
          <Users size={20} className="mr-2" />
          {t('matrix.drillDown.childrenTitle')} ({childrenData.totalChildren}/3)
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <ArrowLeft size={16} className="mr-1" />
          {t('matrix.drillDown.collapse')}
        </Button>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {childrenData.children.map((child, index) => (
          <div key={index} className="border border-border rounded-lg p-4 bg-background shadow-sm hover:shadow-md transition-shadow">
            <div className="text-center">
              {/* Position Icon */}
              <div className="text-xl mb-2">
                {child.position === 'L' ? '👈' : child.position === 'M' ? '🎯' : '👉'}
              </div>
              
              <div className="text-sm font-medium text-foreground mb-2">
                {child.position}
              </div>
              
              {child.member ? (
                <>
                  <div className="text-xs text-foreground font-mono mb-2 bg-muted/50 px-2 py-1 rounded border border-border">
                    {child.member.wallet.slice(0, 6)}...{child.member.wallet.slice(-4)}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {new Date(child.member.joinedAt).toLocaleDateString()}
                  </div>
                  <Badge 
                    variant={child.member.type === 'is_direct' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {child.member.type === 'is_direct' ? t('matrix.drillDown.directReferral') : t('matrix.drillDown.spillover')}
                  </Badge>
                </>
              ) : (
                <div className="text-xs text-gray-400 italic">{t('matrix.drillDown.emptySlot')}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DrillDownMatrixView: React.FC<DrillDownMatrixViewProps> = ({ 
  rootWalletAddress, 
  rootUser 
}) => {
  const { t } = useI18n();
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const { data: matrixData, isLoading, error } = useLayeredMatrix(rootWalletAddress);

  const handleExpand = (memberWallet: string) => {
    setExpandedMember(expandedMember === memberWallet ? null : memberWallet);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500 flex items-center justify-center">
            <User className="animate-spin mr-2" size={20} />
            {t('matrix.drillDown.loading')}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            {t('matrix.errors.loadFailed')}: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!matrixData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            {t('matrix.drillDown.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-secondary border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-honey">
          <div className="flex items-center">
            <Home size={20} className="mr-2" />
            {t('matrix.drillDown.title')}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Users size={16} className="mr-1" />
            <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
              {matrixData.totalLayer1Members}/3
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* 3x3 矩阵布局 - 根节点在中心，L M R 围绕 */}
        <div className="grid grid-cols-3 gap-4 mb-6 max-w-2xl mx-auto">
          {/* 第一行 - 空位, 上级引荐人, 空位 */}
          <div></div>
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 min-h-[120px] flex items-center justify-center bg-muted/10">
            <div className="text-center">
              <div className="text-2xl mb-2">⬆️</div>
              <div className="text-sm font-medium text-muted-foreground">{t('matrix.drillDown.upline')}</div>
              <div className="text-xs text-muted-foreground/70 mt-1">{t('matrix.drillDown.uplineTitle')}</div>
            </div>
          </div>
          <div></div>

          {/* 第二行 - L, 根节点(中心), R */}
          {/* L 位置 */}
          {(() => {
            const leftNode = matrixData.layer1Matrix.find(n => n.position === 'L');
            return (
              <MatrixNode
                key="L"
                position="L"
                member={leftNode?.member || null}
                onExpand={handleExpand}
                isExpanded={expandedMember === leftNode?.member?.wallet}
              />
            );
          })()}

          {/* 根节点 (中心位置) */}
          <div className="border-2 border-honey rounded-lg p-4 min-h-[120px] bg-gradient-to-br from-honey/10 to-honey/20 shadow-lg hover:shadow-xl transition-all duration-200">
            <div className="text-center">
              <Trophy className="mx-auto mb-2 text-honey" size={24} />
              <div className="text-sm font-bold text-honey mb-2">{t('matrix.drillDown.rootNode')}</div>
              <div className="text-xs text-honey/80 mb-2 font-mono bg-background/80 px-2 py-1 rounded border border-honey/20">
                {rootWalletAddress.slice(0, 6)}...{rootWalletAddress.slice(-4)}
              </div>
              {rootUser && (
                <Badge variant="outline" className="text-xs bg-honey/10 border-honey/50 text-honey">
                  {t('common.level')} {rootUser.currentLevel}
                </Badge>
              )}
            </div>
          </div>

          {/* R 位置 */}
          {(() => {
            const rightNode = matrixData.layer1Matrix.find(n => n.position === 'R');
            return (
              <MatrixNode
                key="R"
                position="R"
                member={rightNode?.member || null}
                onExpand={handleExpand}
                isExpanded={expandedMember === rightNode?.member?.wallet}
              />
            );
          })()}

          {/* 第三行 - 空位, M, 空位 */}
          <div></div>
          {(() => {
            const middleNode = matrixData.layer1Matrix.find(n => n.position === 'M');
            return (
              <MatrixNode
                key="M"
                position="M"
                member={middleNode?.member || null}
                onExpand={handleExpand}
                isExpanded={expandedMember === middleNode?.member?.wallet}
              />
            );
          })()}
          <div></div>
        </div>

        {/* 展开的下级成员 */}
        {expandedMember && (
          <ChildrenMatrix
            parentWallet={expandedMember}
            matrixRootWallet={rootWalletAddress}
            onClose={() => setExpandedMember(null)}
          />
        )}

        {/* 矩阵说明 */}
        <div className="mt-6 p-4 bg-honey/5 rounded-lg border border-honey/20">
          <h4 className="text-sm font-semibold text-honey mb-3">📋 {t('matrix.drillDown.explanation.title')}</h4>
          <ul className="text-xs text-honey/80 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">🏆</span>
              <span>{t('matrix.drillDown.explanation.rootPosition')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">👈</span>
              <span>{t('matrix.drillDown.explanation.lmrPositions')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">👆</span>
              <span>{t('matrix.drillDown.explanation.expandFeature')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">⬇️</span>
              <span>{t('matrix.drillDown.explanation.spilloverLogic')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🔗</span>
              <span>{t('matrix.drillDown.explanation.layeredDisplay')}</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DrillDownMatrixView;
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';
import { RefreshCw, CheckCircle, AlertCircle, Users, Database } from 'lucide-react';

interface SyncStats {
  totalMembers: number;
  totalReferrals: number;
  missingInReferrals: number;
  syncPercentage: string;
}

export function MemberSyncPanel() {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);

  const verifySyncStatus = async () => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-members', {
        body: {
          action: 'verify-sync'
        }
      });

      if (error) throw error;

      if (data.success) {
        setSyncStats(data.stats);
        toast({
          title: "同步状态验证完成",
          description: `${data.stats.syncPercentage}% 的会员已同步到矩阵系统`,
        });
      }
    } catch (error: any) {
      console.error('验证失败:', error);
      toast({
        title: "验证失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const syncMissingMembers = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-members', {
        body: {
          action: 'sync-missing-members'
        }
      });

      if (error) throw error;

      setSyncResult(data);

      toast({
        title: data.success ? "同步成功" : "同步部分完成",
        description: data.message || `已同步 ${data.syncedCount} 个会员`,
        variant: data.success ? "default" : "destructive",
      });

      // 重新验证状态
      await verifySyncStatus();
    } catch (error: any) {
      console.error('同步失败:', error);
      toast({
        title: "同步失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const syncAllMembers = async () => {
    if (!confirm('确定要同步所有会员吗？这可能需要一些时间。')) {
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-members', {
        body: {
          action: 'sync-all-members'
        }
      });

      if (error) throw error;

      setSyncResult(data);

      toast({
        title: "全量同步完成",
        description: `已处理 ${data.totalMembers} 个会员，同步 ${data.syncedCount} 个`,
      });

      // 重新验证状态
      await verifySyncStatus();
    } catch (error: any) {
      console.error('全量同步失败:', error);
      toast({
        title: "同步失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="border-honey/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-honey">
          <Database className="h-5 w-5" />
          会员数据同步
        </CardTitle>
        <CardDescription>
          同步 members 表数据到 referrals 矩阵系统
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 同步状态 */}
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">同步状态</span>
            <Button
              onClick={verifySyncStatus}
              disabled={isVerifying}
              size="sm"
              variant="outline"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  验证中...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  验证状态
                </>
              )}
            </Button>
          </div>

          {syncStats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-background rounded border border-border">
                <div className="text-2xl font-bold text-honey">
                  {syncStats.totalMembers}
                </div>
                <div className="text-xs text-muted-foreground">总会员数</div>
              </div>
              <div className="p-3 bg-background rounded border border-border">
                <div className="text-2xl font-bold text-blue-400">
                  {syncStats.totalReferrals}
                </div>
                <div className="text-xs text-muted-foreground">已同步到矩阵</div>
              </div>
              <div className="p-3 bg-background rounded border border-border">
                <div className="text-2xl font-bold text-red-400">
                  {syncStats.missingInReferrals}
                </div>
                <div className="text-xs text-muted-foreground">待同步</div>
              </div>
              <div className="p-3 bg-background rounded border border-border">
                <div className="text-2xl font-bold text-green-400">
                  {syncStats.syncPercentage}%
                </div>
                <div className="text-xs text-muted-foreground">同步率</div>
              </div>
            </div>
          )}
        </div>

        {/* 同步操作 */}
        <div className="space-y-3">
          <Button
            onClick={syncMissingMembers}
            disabled={isSyncing || isVerifying}
            className="w-full bg-honey hover:bg-honey/90 text-black"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                同步中...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                同步缺失的会员
              </>
            )}
          </Button>

          <Button
            onClick={syncAllMembers}
            disabled={isSyncing || isVerifying}
            variant="outline"
            className="w-full"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                全量同步中...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                全量同步所有会员
              </>
            )}
          </Button>
        </div>

        {/* 同步结果 */}
        {syncResult && (
          <div className={`p-4 rounded-lg border ${
            syncResult.success
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-start gap-3">
              {syncResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-2">
                <div className="font-semibold">
                  {syncResult.success ? '同步成功' : '同步完成（部分错误）'}
                </div>
                <div className="text-sm">
                  已同步: <Badge variant="outline">{syncResult.syncedCount}</Badge>
                  {syncResult.totalMembers && (
                    <> / 总计: <Badge variant="outline">{syncResult.totalMembers}</Badge></>
                  )}
                </div>
                {syncResult.errors && syncResult.errors.length > 0 && (
                  <details className="text-sm space-y-1">
                    <summary className="cursor-pointer text-red-400">
                      错误详情 ({syncResult.errors.length})
                    </summary>
                    <ul className="mt-2 space-y-1 pl-4">
                      {syncResult.errors.slice(0, 10).map((error: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground">
                          • {error}
                        </li>
                      ))}
                      {syncResult.errors.length > 10 && (
                        <li className="text-xs text-muted-foreground">
                          ... 还有 {syncResult.errors.length - 10} 个错误
                        </li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 说明 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• <strong>同步缺失的会员:</strong> 只同步 members 表中存在但 referrals 表中缺失的会员</p>
          <p>• <strong>全量同步:</strong> 验证并同步所有会员数据（包括已存在的）</p>
          <p>• 同步时会自动计算矩阵位置（Layer, Position, Parent）</p>
          <p>• 使用 BFS + L/M/R 溢出规则进行矩阵安置</p>
        </div>
      </CardContent>
    </Card>
  );
}

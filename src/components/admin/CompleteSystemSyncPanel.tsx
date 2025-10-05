import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Database,
  Users,
  Grid3x3,
  DollarSign,
  ShieldCheck
} from 'lucide-react';

interface SystemStatus {
  users: number;
  members: number;
  memberships: number;
  referrals: number;
  direct_rewards: number;
  layer_rewards: number;
  total_rewards: number;
  sync_gaps: {
    users_without_members: number;
    members_without_referrals: number;
    reward_mismatches: number;
  };
}

export function CompleteSystemSyncPanel() {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_system_sync_status');

      if (error) throw error;

      setSystemStatus(data);
    } catch (error: any) {
      console.error('Failed to load system status:', error);
      toast({
        title: "加载失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runFullSync = async () => {
    if (!confirm('确定要运行完整系统同步吗？\n\n这将执行以下步骤：\n1. users → members/membership\n2. members → referrals (矩阵)\n3. 重算直推奖励\n4. 验证奖励总数')) {
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      setCurrentStep('准备同步...');

      const { data, error } = await supabase.functions.invoke('complete-system-sync', {
        body: { action: 'full-system-sync' }
      });

      if (error) throw error;

      setSyncResult(data);

      toast({
        title: data.success ? "同步成功" : "同步完成（部分错误）",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });

      // Reload status
      await loadSystemStatus();
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast({
        title: "同步失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
      setCurrentStep('');
    }
  };

  const runStep = async (step: string, action: string, description: string) => {
    setIsSyncing(true);
    setCurrentStep(description);

    try {
      const { data, error } = await supabase.functions.invoke('complete-system-sync', {
        body: { action }
      });

      if (error) throw error;

      toast({
        title: `${description}完成`,
        description: data.message || '操作成功',
      });

      // Reload status
      await loadSystemStatus();
    } catch (error: any) {
      console.error(`${step} failed:`, error);
      toast({
        title: `${description}失败`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="space-y-6">
      {/* System Status Overview */}
      <Card className="border-honey/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-honey">
            <Database className="h-5 w-5" />
            系统同步状态
          </CardTitle>
          <CardDescription>
            完整的数据同步管理：users → members → matrix → rewards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Grid */}
          {systemStatus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <Users className="h-5 w-5 text-blue-400 mb-2" />
                <div className="text-2xl font-bold text-blue-400">{systemStatus.users}</div>
                <div className="text-xs text-muted-foreground">Users</div>
              </div>

              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <Users className="h-5 w-5 text-green-400 mb-2" />
                <div className="text-2xl font-bold text-green-400">{systemStatus.members}</div>
                <div className="text-xs text-muted-foreground">Members</div>
              </div>

              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <Grid3x3 className="h-5 w-5 text-purple-400 mb-2" />
                <div className="text-2xl font-bold text-purple-400">{systemStatus.referrals}</div>
                <div className="text-xs text-muted-foreground">Matrix</div>
              </div>

              <div className="p-4 bg-honey/10 rounded-lg border border-honey/30">
                <DollarSign className="h-5 w-5 text-honey mb-2" />
                <div className="text-2xl font-bold text-honey">{systemStatus.total_rewards}</div>
                <div className="text-xs text-muted-foreground">Total Rewards</div>
              </div>
            </div>
          )}

          {/* Sync Gaps */}
          {systemStatus && (systemStatus.sync_gaps.users_without_members > 0 ||
            systemStatus.sync_gaps.members_without_referrals > 0 ||
            systemStatus.sync_gaps.reward_mismatches > 0) && (
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="font-semibold text-red-400">发现数据缺口</span>
              </div>
              <div className="space-y-2 text-sm">
                {systemStatus.sync_gaps.users_without_members > 0 && (
                  <div className="flex justify-between">
                    <span>Users 缺少 Members 记录:</span>
                    <Badge variant="destructive">{systemStatus.sync_gaps.users_without_members}</Badge>
                  </div>
                )}
                {systemStatus.sync_gaps.members_without_referrals > 0 && (
                  <div className="flex justify-between">
                    <span>Members 未放入矩阵:</span>
                    <Badge variant="destructive">{systemStatus.sync_gaps.members_without_referrals}</Badge>
                  </div>
                )}
                {systemStatus.sync_gaps.reward_mismatches > 0 && (
                  <div className="flex justify-between">
                    <span>奖励计算不匹配:</span>
                    <Badge variant="destructive">{systemStatus.sync_gaps.reward_mismatches}</Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reward Breakdown */}
          {systemStatus && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">直推奖励</div>
                <div className="text-2xl font-bold text-green-400">{systemStatus.direct_rewards}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">层级奖励</div>
                <div className="text-2xl font-bold text-blue-400">{systemStatus.layer_rewards}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Actions */}
      <Card className="border-honey/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            同步操作
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Full Sync */}
          <Button
            onClick={runFullSync}
            disabled={isSyncing || isLoading}
            className="w-full bg-gradient-to-r from-honey to-amber-400 hover:from-honey/90 hover:to-amber-500 text-black font-bold"
            size="lg"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {currentStep || '同步中...'}
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                完整系统同步
              </>
            )}
          </Button>

          {/* Individual Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={() => runStep('step1', 'sync-users-to-members', 'Step 1: Users 同步')}
              disabled={isSyncing || isLoading}
              variant="outline"
            >
              <Users className="h-4 w-4 mr-2" />
              1. Users → Members
            </Button>

            <Button
              onClick={() => runStep('step2', 'rebuild-matrix', 'Step 2: 矩阵重建')}
              disabled={isSyncing || isLoading}
              variant="outline"
            >
              <Grid3x3 className="h-4 w-4 mr-2" />
              2. 重建矩阵
            </Button>

            <Button
              onClick={() => runStep('step3', 'recalculate-direct-rewards', 'Step 3: 直推奖励')}
              disabled={isSyncing || isLoading}
              variant="outline"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              3. 重算直推奖励
            </Button>

            <Button
              onClick={() => runStep('step4', 'validate-reward-totals', 'Step 4: 验证总数')}
              disabled={isSyncing || isLoading}
              variant="outline"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              4. 验证奖励总数
            </Button>
          </div>

          <Button
            onClick={loadSystemStatus}
            disabled={isLoading}
            variant="ghost"
            className="w-full"
            size="sm"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                刷新状态...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-2" />
                刷新状态
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Sync Results */}
      {syncResult && (
        <Card className={`border ${syncResult.success ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {syncResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
              同步结果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm font-medium">{syncResult.message}</div>

            {syncResult.results && (
              <div className="space-y-2 text-sm">
                {syncResult.results.step1_users_to_members && (
                  <details className="p-3 bg-background rounded border">
                    <summary className="cursor-pointer font-semibold">
                      Step 1: Users → Members
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto">
                      {JSON.stringify(syncResult.results.step1_users_to_members, null, 2)}
                    </pre>
                  </details>
                )}

                {syncResult.results.step2_matrix_rebuild && (
                  <details className="p-3 bg-background rounded border">
                    <summary className="cursor-pointer font-semibold">
                      Step 2: 矩阵重建
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto">
                      {JSON.stringify(syncResult.results.step2_matrix_rebuild, null, 2)}
                    </pre>
                  </details>
                )}

                {syncResult.results.step3_direct_rewards && (
                  <details className="p-3 bg-background rounded border">
                    <summary className="cursor-pointer font-semibold">
                      Step 3: 直推奖励
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto">
                      {JSON.stringify(syncResult.results.step3_direct_rewards, null, 2)}
                    </pre>
                  </details>
                )}

                {syncResult.results.step4_validation && (
                  <details className="p-3 bg-background rounded border">
                    <summary className="cursor-pointer font-semibold">
                      Step 4: 验证结果
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto">
                      {JSON.stringify(syncResult.results.step4_validation, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-sm">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p><strong>完整系统同步:</strong> 按顺序执行所有4个步骤，确保数据完整性</p>
          <p><strong>Step 1:</strong> 将 users 表数据同步到 members 和 memberships 表</p>
          <p><strong>Step 2:</strong> 根据 members 重建完整的 3x3 矩阵结构（BFS + L/M/R）</p>
          <p><strong>Step 3:</strong> 重新计算直推奖励，确保数量与 members 一致</p>
          <p><strong>Step 4:</strong> 验证 总奖励 = 直推奖励 + 层级奖励</p>
        </CardContent>
      </Card>
    </div>
  );
}

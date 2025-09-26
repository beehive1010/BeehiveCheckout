import {useState} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '../ui/card';
import {Button} from '../ui/button';
import {AlertTriangle, CheckCircle, Gift, Loader2, XCircle} from 'lucide-react';
import {useToast} from '../../hooks/use-toast';
import {useIsMobile} from '../../hooks/use-mobile';

interface RepairResult {
  success: boolean;
  repair_summary?: {
    system_logic: string;
    total_memberships_analyzed: number;
    already_correct: number;
    needed_repair: number;
    successfully_repaired: number;
    total_layer_rewards_after: number;
    error_count: number;
    repair_examples: string[];
    errors: string[];
    completion_timestamp: string;
  };
  error?: string;
  note?: string;
}

export function Level1RewardRepairButton() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isRunning, setIsRunning] = useState(false);
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);

  const runLevel1RewardRepair = async () => {
    setIsRunning(true);
    setRepairResult(null);
    
    const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
    
    try {
      toast({
        title: "Starting Level 1 Reward Repair",
        description: "正在分析和修复Level 1直推奖励...",
      });

      const response = await fetch(`${API_BASE}/fix-level1-direct-rewards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: RepairResult = await response.json();
      setRepairResult(result);
      
      if (result.success && result.repair_summary) {
        const summary = result.repair_summary;
        toast({
          title: "Level 1 奖励修复完成",
          description: `分析: ${summary.total_memberships_analyzed}个，已正确: ${summary.already_correct}个，已修复: ${summary.successfully_repaired}个`,
        });
      } else {
        throw new Error(result.error || 'Level 1 reward repair failed');
      }
      
    } catch (error) {
      console.error('Level 1 reward repair failed:', error);
      const errorResult: RepairResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
      setRepairResult(errorResult);
      
      toast({
        title: "Level 1 奖励修复失败",
        description: errorResult.error,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const resetResult = () => {
    setRepairResult(null);
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Gift className="h-5 w-5 text-blue-500" />
          <span>Level 1 直推奖励修复工具</span>
        </CardTitle>
        <CardDescription>
          检查和修复Level 1 membership的直推奖励。只修复缺失的奖励，不会重复创建。
          <br />
          <span className="text-xs text-muted-foreground mt-1 block">
            系统逻辑: Level 1奖励直接给members.referrer_wallet作为正常layer rewards
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Control Buttons */}
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-3`}>
          <Button 
            onClick={runLevel1RewardRepair}
            disabled={isRunning}
            className="flex-1"
            variant="default"
          >
            {isRunning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Gift className="mr-2 h-4 w-4" />
            )}
            {isRunning ? '正在修复Level 1奖励...' : '运行Level 1奖励修复'}
          </Button>
          
          <Button 
            onClick={resetResult}
            disabled={isRunning}
            variant="outline"
            size={isMobile ? "default" : "sm"}
          >
            清除结果
          </Button>
        </div>

        {/* Repair Results */}
        {repairResult && (
          <div className="bg-muted/30 rounded-lg p-4 space-y-4">
            <div className="flex items-center space-x-2">
              {repairResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <h3 className="text-lg font-semibold">
                {repairResult.success ? '修复完成' : '修复失败'}
              </h3>
            </div>
            
            {/* Error Display */}
            {!repairResult.success && repairResult.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-700 dark:text-red-300">错误信息</span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {repairResult.error}
                </p>
                {repairResult.note && (
                  <p className="text-xs text-red-500 dark:text-red-500 mt-2">
                    {repairResult.note}
                  </p>
                )}
              </div>
            )}
            
            {/* Success Results */}
            {repairResult.success && repairResult.repair_summary && (
              <>
                <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-3 text-sm`}>
                  <div className="text-center p-3 bg-background rounded-lg border">
                    <div className="text-2xl font-bold text-blue-600">
                      {repairResult.repair_summary.total_memberships_analyzed}
                    </div>
                    <div className="text-muted-foreground text-xs">分析的membership</div>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg border">
                    <div className="text-2xl font-bold text-green-600">
                      {repairResult.repair_summary.already_correct}
                    </div>
                    <div className="text-muted-foreground text-xs">已经正确</div>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg border">
                    <div className="text-2xl font-bold text-orange-600">
                      {repairResult.repair_summary.needed_repair}
                    </div>
                    <div className="text-muted-foreground text-xs">需要修复</div>
                  </div>
                  <div className="text-center p-3 bg-background rounded-lg border">
                    <div className="text-2xl font-bold text-purple-600">
                      {repairResult.repair_summary.successfully_repaired}
                    </div>
                    <div className="text-muted-foreground text-xs">成功修复</div>
                  </div>
                </div>

                {repairResult.repair_summary.repair_examples.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>修复示例</span>
                    </h4>
                    <div className="space-y-2">
                      {repairResult.repair_summary.repair_examples.slice(0, 5).map((example, index) => (
                        <div key={index} className="text-xs font-mono bg-background border rounded p-2">
                          ✅ {example}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {repairResult.repair_summary.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>错误记录 ({repairResult.repair_summary.error_count})</span>
                    </h4>
                    <div className="space-y-2">
                      {repairResult.repair_summary.errors.slice(0, 3).map((error, index) => (
                        <div key={index} className="text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                          ❌ {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground bg-background border rounded-lg p-3">
                  <div className="font-medium mb-1">系统逻辑说明:</div>
                  <div>{repairResult.repair_summary.system_logic}</div>
                  <div className="mt-2 text-right">
                    完成时间: {new Date(repairResult.repair_summary.completion_timestamp).toLocaleString('zh-CN')}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Usage Instructions */}
        <div className="text-sm text-muted-foreground space-y-2 bg-background/50 rounded-lg p-4 border-l-4 border-blue-500">
          <h4 className="font-medium text-foreground">使用说明:</h4>
          <ul className="space-y-1 list-disc list-inside">
            <li>该工具只修复缺失的Level 1直推奖励</li>
            <li>不会创建重复的奖励记录</li>
            <li>自动验证1st/2nd和3rd+奖励的验证逻辑</li>
            <li>安全执行，不会影响已存在的正确奖励</li>
          </ul>
        </div>

      </CardContent>
    </Card>
  );
}
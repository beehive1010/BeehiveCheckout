import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabaseClient';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Database,
  Users,
  Shield,
  Award,
  Link2,
  Loader2,
  Clock,
  DollarSign,
  GitBranch
} from 'lucide-react';

interface SystemCheckResult {
  success: boolean;
  data?: {
    issues: number;
    details: string;
    recommendations?: string[];
    breakdown?: any;
  };
  error?: string;
}

interface SystemFixResult {
  success: boolean;
  data?: {
    fixed: number;
    details: string;
    summary?: string[];
    breakdown?: any;
  };
  error?: string;
}

interface CheckCategory {
  id: string;
  name: string;
  icon: any;
  checkType: string;
  result?: SystemCheckResult;
  canFix: boolean;
}

export function DataIntegrityChecker() {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [checkCategories, setCheckCategories] = useState<CheckCategory[]>([
    {
      id: 'users_sync',
      name: 'Users & Members Sync',
      icon: Users,
      checkType: 'users_sync',
      canFix: true
    },
    {
      id: 'membership_sync',
      name: 'Membership Levels',
      icon: Shield,
      checkType: 'membership_sync',
      canFix: true
    },
    {
      id: 'claimed_nft_sync',
      name: 'Claimed NFT → Members Sync',
      icon: Database,
      checkType: 'fix_claimed_nft_sync',
      canFix: true
    },
    {
      id: 'membership_to_members',
      name: 'Membership → Members Records',
      icon: Shield,
      checkType: 'fix_membership_to_members',
      canFix: true
    },
    {
      id: 'missing_referrers',
      name: 'Members Without Referrers',
      icon: Users,
      checkType: 'fix_missing_referrers',
      canFix: true
    },
    {
      id: 'missing_referral_records',
      name: 'Missing Referral Records',
      icon: Link2,
      checkType: 'fix_missing_referral_records',
      canFix: true
    },
    {
      id: 'missing_matrix_placements',
      name: 'Missing Matrix Placements',
      icon: GitBranch,
      checkType: 'fix_missing_matrix_placements',
      canFix: true
    },
    {
      id: 'missing_direct_rewards',
      name: 'Missing Direct Rewards (100 USD)',
      icon: Award,
      checkType: 'fix_missing_direct_rewards',
      canFix: true
    },
    {
      id: 'missing_layer_rewards',
      name: 'Missing Layer Rewards (L2-19)',
      icon: Award,
      checkType: 'fix_missing_layer_rewards',
      canFix: true
    },
    {
      id: 'referrals_sync',
      name: 'Referral Integrity',
      icon: Link2,
      checkType: 'referrals_sync',
      canFix: true
    },
    {
      id: 'matrix_gaps',
      name: 'Matrix Position Conflicts',
      icon: GitBranch,
      checkType: 'matrix_position_conflicts',
      canFix: true
    },
    {
      id: 'reward_system',
      name: 'Reward System',
      icon: Award,
      checkType: 'reward_system_check',
      canFix: true
    },
    {
      id: 'reward_timers',
      name: 'Reward Timers',
      icon: Clock,
      checkType: 'reward_timer_check',
      canFix: true
    },
    {
      id: 'level_validation',
      name: 'Level Validation',
      icon: CheckCircle,
      checkType: 'level_validation_check',
      canFix: true
    },
    {
      id: 'member_balance',
      name: 'Member Balances',
      icon: DollarSign,
      checkType: 'member_balance_check',
      canFix: true
    },
    {
      id: 'balance_sync',
      name: 'Rewards → Balances Sync',
      icon: DollarSign,
      checkType: 'balance_sync_check',
      canFix: true
    },
    {
      id: 'rollup_integrity',
      name: 'Rollup Integrity',
      icon: RefreshCw,
      checkType: 'rollup_integrity_check',
      canFix: true
    },
    {
      id: 'data_consistency',
      name: 'Overall Data Consistency',
      icon: Database,
      checkType: 'data_consistency',
      canFix: true
    }
  ]);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');

  const runFullCheck = async () => {
    setIsChecking(true);
    setProgress(0);
    setCurrentTask('Starting system checks...');

    try {
      const updatedCategories: CheckCategory[] = [];
      const totalChecks = checkCategories.length;

      for (let i = 0; i < checkCategories.length; i++) {
        const category = checkCategories[i];
        setCurrentTask(`Checking ${category.name}...`);
        setProgress(Math.round(((i + 1) / totalChecks) * 100));

        try {
          // Call the Edge Function for this check
          const { data, error } = await supabase.functions.invoke('admin-system-check', {
            body: { checkType: category.checkType }
          });

          if (error) throw error;

          updatedCategories.push({
            ...category,
            result: data as SystemCheckResult
          });
        } catch (error: any) {
          updatedCategories.push({
            ...category,
            result: {
              success: false,
              error: error.message || 'Check failed'
            }
          });
        }
      }

      setCheckCategories(updatedCategories);
      setCurrentTask('All checks completed');

      const totalIssues = updatedCategories.reduce((sum, cat) =>
        sum + (cat.result?.data?.issues || 0), 0
      );

      toast({
        title: 'System Check Complete',
        description: `Found ${totalIssues} potential issues across ${checkCategories.length} categories`,
      });
    } catch (error: any) {
      toast({
        title: 'Check Failed',
        description: error.message || 'Failed to complete system check',
        variant: 'destructive'
      });
    } finally {
      setIsChecking(false);
      setProgress(0);
      setCurrentTask('');
    }
  };

  const autoFixIssues = async () => {
    setIsFixing(true);
    setCurrentTask('Starting auto-fix...');

    try {
      const fixableCategories = checkCategories.filter(
        cat => cat.canFix && cat.result?.data && cat.result.data.issues > 0
      );

      if (fixableCategories.length === 0) {
        toast({
          title: 'No Issues to Fix',
          description: 'All systems are operating correctly',
        });
        setIsFixing(false);
        return;
      }

      let totalFixed = 0;
      const fixSummary: string[] = [];

      for (const category of fixableCategories) {
        setCurrentTask(`Fixing ${category.name}...`);

        try {
          const fixType = getFixType(category.checkType);
          const { data, error } = await supabase.functions.invoke('admin-system-fix', {
            body: {
              checkType: fixType,
              options: { processTimers: true }
            }
          });

          if (error) throw error;

          const fixResult = data as SystemFixResult;
          if (fixResult.success && fixResult.data) {
            totalFixed += fixResult.data.fixed;
            fixSummary.push(`${category.name}: Fixed ${fixResult.data.fixed} issues`);
          }
        } catch (error: any) {
          fixSummary.push(`${category.name}: Failed - ${error.message}`);
        }
      }

      toast({
        title: 'Auto-Fix Complete',
        description: `Fixed ${totalFixed} issues. Running verification check...`,
      });

      // Re-run checks to verify fixes
      await runFullCheck();

      toast({
        title: 'Verification Complete',
        description: fixSummary.join('\n'),
      });
    } catch (error: any) {
      toast({
        title: 'Auto-Fix Failed',
        description: error.message || 'Failed to fix issues',
        variant: 'destructive'
      });
    } finally {
      setIsFixing(false);
      setCurrentTask('');
    }
  };

  // Map check type to fix type
  const getFixType = (checkType: string): string => {
    // Most check types can be used directly as fix types
    // Special mappings where they differ
    const mapping: Record<string, string> = {
      'balance_sync_check': 'fix_balance_sync',
      'reward_system_check': 'reward_system_fix',
      'reward_timer_check': 'reward_timer_fix',
      'level_validation_check': 'level_validation_fix',
      'member_balance_check': 'member_balance_fix',
      'rollup_integrity_check': 'rollup_integrity_fix',
      'matrix_position_conflicts': 'matrix_position_conflicts_fix',
    };
    return mapping[checkType] || checkType;
  };

  const fixSingleCategory = async (category: CheckCategory) => {
    setIsFixing(true);
    setCurrentTask(`Fixing ${category.name}...`);

    try {
      const fixType = getFixType(category.checkType);
      const { data, error } = await supabase.functions.invoke('admin-system-fix', {
        body: {
          checkType: fixType,
          options: { processTimers: true }
        }
      });

      if (error) throw error;

      const fixResult = data as SystemFixResult;

      if (fixResult.success && fixResult.data) {
        toast({
          title: 'Fix Complete',
          description: `${category.name}: Fixed ${fixResult.data.fixed} issues`,
        });

        // Re-run just this check
        const { data: checkData, error: checkError } = await supabase.functions.invoke('admin-system-check', {
          body: { checkType: category.checkType }
        });

        if (!checkError && checkData) {
          const updatedCategories = checkCategories.map(cat =>
            cat.id === category.id ? { ...cat, result: checkData as SystemCheckResult } : cat
          );
          setCheckCategories(updatedCategories);
        }
      } else {
        throw new Error(fixResult.error || 'Fix failed');
      }
    } catch (error: any) {
      toast({
        title: 'Fix Failed',
        description: error.message || 'Failed to fix issues',
        variant: 'destructive'
      });
    } finally {
      setIsFixing(false);
      setCurrentTask('');
    }
  };

  const getSeverityBadge = (issues: number) => {
    if (issues === 0) {
      return <Badge className="bg-green-500">No Issues</Badge>;
    } else if (issues < 5) {
      return <Badge className="bg-yellow-500">Warning</Badge>;
    } else {
      return <Badge className="bg-red-500">Critical</Badge>;
    }
  };

  const totalIssues = checkCategories.reduce((sum, cat) =>
    sum + (cat.result?.data?.issues || 0), 0
  );
  const totalChecked = checkCategories.filter(cat => cat.result).length;
  const hasIssues = totalIssues > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-honey">Data Integrity Checker</CardTitle>
              <CardDescription>
                Comprehensive system validation for users, members, referrals, matrix, rewards, and balances
              </CardDescription>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={runFullCheck}
                disabled={isChecking || isFixing}
                className="bg-honey hover:bg-honey/90"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Run Full Check
                  </>
                )}
              </Button>
              {hasIssues && (
                <Button
                  onClick={autoFixIssues}
                  disabled={isChecking || isFixing}
                  variant="outline"
                  className="border-honey/20 hover:bg-honey/10"
                >
                  {isFixing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Fixing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Auto-Fix All
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {(isChecking || isFixing) && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{currentTask}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Summary Stats */}
      {totalChecked > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Checks</p>
                  <p className="text-2xl font-bold text-honey">{totalChecked}</p>
                </div>
                <Database className="h-8 w-8 text-honey/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Issues</p>
                  <p className="text-2xl font-bold text-honey">{totalIssues}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Passed</p>
                  <p className="text-2xl font-bold text-green-500">
                    {checkCategories.filter(c => c.result?.data?.issues === 0).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-500">
                    {checkCategories.filter(c => c.result?.data && c.result.data.issues > 0).length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Check Results */}
      <div className="space-y-4">
        {checkCategories.map((category) => {
          const Icon = category.icon;
          const hasResult = !!category.result;
          const hasError = category.result?.error;
          const issues = category.result?.data?.issues || 0;

          return (
            <Card key={category.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-honey/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-honey" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg">{category.name}</h3>
                        {hasResult && getSeverityBadge(issues)}
                      </div>

                      {hasError && (
                        <Alert variant="destructive" className="mb-3">
                          <AlertDescription>{category.result?.error}</AlertDescription>
                        </Alert>
                      )}

                      {category.result?.data && (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            {category.result.data.details}
                          </p>

                          {category.result.data.breakdown && (
                            <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                              <pre className="whitespace-pre-wrap overflow-x-auto">
                                {JSON.stringify(category.result.data.breakdown, null, 2)}
                              </pre>
                            </div>
                          )}

                          {category.result.data.recommendations &&
                           category.result.data.recommendations.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Recommendations:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                {category.result.data.recommendations.map((rec, idx) => (
                                  <li key={idx}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {!hasResult && !isChecking && (
                        <p className="text-sm text-muted-foreground">
                          Click "Run Full Check" to analyze this category
                        </p>
                      )}
                    </div>
                  </div>

                  {hasResult && issues > 0 && category.canFix && (
                    <Button
                      onClick={() => fixSingleCategory(category)}
                      disabled={isFixing || isChecking}
                      variant="outline"
                      size="sm"
                      className="border-honey/20 hover:bg-honey/10 ml-4"
                    >
                      {isFixing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Fix'
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

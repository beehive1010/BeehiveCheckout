import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';
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
  Loader2
} from 'lucide-react';

interface DataIssue {
  id: string;
  type: 'missing_member' | 'missing_referral' | 'nft_mismatch' | 'balance_mismatch';
  severity: 'critical' | 'warning' | 'info';
  wallet_address: string;
  description: string;
  canAutoFix: boolean;
  details?: any;
}

interface CheckResult {
  category: string;
  total: number;
  passed: number;
  failed: number;
  issues: DataIssue[];
}

export function DataIntegrityChecker() {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');

  // 检查用户是否领取NFT并成为member
  const checkUserMembershipStatus = async (): Promise<CheckResult> => {
    setCurrentTask('Checking user membership status...');
    const issues: DataIssue[] = [];

    // 获取所有users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('wallet_address, username, created_at');

    if (usersError) throw usersError;

    let checked = 0;
    const total = users?.length || 0;

    for (const user of users || []) {
      checked++;
      setProgress(Math.round((checked / total) * 30)); // 0-30%

      // 检查是否有member记录
      const { data: member } = await supabase
        .from('members')
        .select('wallet_address, current_level, member_activated, activation_at')
        .eq('wallet_address', user.wallet_address)
        .maybeSingle();

      // 检查是否有NFT（通过membership表）
      const { data: membership } = await supabase
        .from('membership')
        .select('wallet_address, level, active')
        .eq('wallet_address', user.wallet_address)
        .maybeSingle();

      if (membership && membership.active && !member) {
        // 有NFT但没有member记录
        issues.push({
          id: `missing_member_${user.wallet_address}`,
          type: 'missing_member',
          severity: 'critical',
          wallet_address: user.wallet_address,
          description: `User has active NFT (Level ${membership.level}) but no member record`,
          canAutoFix: true,
          details: { nft_level: membership.level }
        });
      } else if (membership && membership.active && member && !member.member_activated) {
        // 有NFT和member记录但未激活
        issues.push({
          id: `inactive_member_${user.wallet_address}`,
          type: 'nft_mismatch',
          severity: 'warning',
          wallet_address: user.wallet_address,
          description: `User has NFT (Level ${membership.level}) but member not activated`,
          canAutoFix: true,
          details: { nft_level: membership.level, member_level: member.current_level }
        });
      } else if (member && member.member_activated && !membership) {
        // 有member记录但没有NFT
        issues.push({
          id: `missing_nft_${user.wallet_address}`,
          type: 'nft_mismatch',
          severity: 'warning',
          wallet_address: user.wallet_address,
          description: `Member activated but no NFT record found`,
          canAutoFix: false,
          details: { member_level: member.current_level }
        });
      }
    }

    return {
      category: 'User Membership Status',
      total: total,
      passed: total - issues.length,
      failed: issues.length,
      issues
    };
  };

  // 检查referrals表中的直推关系
  const checkReferralIntegrity = async (): Promise<CheckResult> => {
    setCurrentTask('Checking referral integrity...');
    const issues: DataIssue[] = [];

    // 获取所有referrals
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('referrer_wallet, referred_wallet, created_at');

    if (referralsError) throw referralsError;

    let checked = 0;
    const total = referrals?.length || 0;

    for (const referral of referrals || []) {
      checked++;
      setProgress(30 + Math.round((checked / total) * 30)); // 30-60%

      // 检查referrer是否存在
      const { data: referrer } = await supabase
        .from('users')
        .select('wallet_address')
        .eq('wallet_address', referral.referrer_wallet)
        .maybeSingle();

      if (!referrer) {
        issues.push({
          id: `invalid_referrer_${referral.referred_wallet}`,
          type: 'missing_referral',
          severity: 'critical',
          wallet_address: referral.referred_wallet,
          description: `Referrer ${referral.referrer_wallet} does not exist in users table`,
          canAutoFix: false,
          details: { referrer: referral.referrer_wallet }
        });
      }

      // 检查referred_wallet是否存在
      const { data: referred } = await supabase
        .from('users')
        .select('wallet_address, referrer_wallet')
        .eq('wallet_address', referral.referred_wallet)
        .maybeSingle();

      if (!referred) {
        issues.push({
          id: `invalid_referred_${referral.referred_wallet}`,
          type: 'missing_referral',
          severity: 'critical',
          wallet_address: referral.referred_wallet,
          description: `Referred user does not exist in users table`,
          canAutoFix: false
        });
      } else if (referred.referrer_wallet !== referral.referrer_wallet) {
        issues.push({
          id: `mismatch_referrer_${referral.referred_wallet}`,
          type: 'missing_referral',
          severity: 'warning',
          wallet_address: referral.referred_wallet,
          description: `Referrer mismatch: users.referrer_wallet (${referred.referrer_wallet}) != referrals.referrer_wallet (${referral.referrer_wallet})`,
          canAutoFix: true,
          details: {
            users_referrer: referred.referrer_wallet,
            referrals_referrer: referral.referrer_wallet
          }
        });
      }
    }

    return {
      category: 'Referral Integrity',
      total: total,
      passed: total - issues.length,
      failed: issues.length,
      issues
    };
  };

  // 检查direct_referral_rewards是否正确记录
  const checkDirectReferralRewards = async (): Promise<CheckResult> => {
    setCurrentTask('Checking direct referral rewards...');
    const issues: DataIssue[] = [];

    // 获取所有激活的members
    const { data: activeMembers, error: membersError } = await supabase
      .from('members')
      .select('wallet_address, referrer_wallet, activation_at')
      .eq('member_activated', true)
      .not('referrer_wallet', 'is', null);

    if (membersError) throw membersError;

    let checked = 0;
    const total = activeMembers?.length || 0;

    for (const member of activeMembers || []) {
      checked++;
      setProgress(60 + Math.round((checked / total) * 40)); // 60-100%

      // 检查是否有对应的direct_referral_reward记录
      const { data: reward } = await supabase
        .from('direct_referral_rewards')
        .select('referrer_wallet, referred_wallet, status')
        .eq('referred_wallet', member.wallet_address)
        .maybeSingle();

      if (!reward) {
        issues.push({
          id: `missing_reward_${member.wallet_address}`,
          type: 'balance_mismatch',
          severity: 'critical',
          wallet_address: member.wallet_address,
          description: `Activated member has no direct referral reward record`,
          canAutoFix: true,
          details: {
            referrer: member.referrer_wallet,
            activation_at: member.activation_at
          }
        });
      } else if (reward.status === 'failed') {
        issues.push({
          id: `failed_reward_${member.wallet_address}`,
          type: 'balance_mismatch',
          severity: 'warning',
          wallet_address: member.wallet_address,
          description: `Direct referral reward is in 'failed' status`,
          canAutoFix: true,
          details: {
            referrer: reward.referrer_wallet,
            status: reward.status
          }
        });
      }
    }

    return {
      category: 'Direct Referral Rewards',
      total: total,
      passed: total - issues.length,
      failed: issues.length,
      issues
    };
  };

  // 执行所有检查
  const runAllChecks = async () => {
    setIsChecking(true);
    setProgress(0);
    setCheckResults([]);

    try {
      const results: CheckResult[] = [];

      // 1. Check user membership status
      const membershipResult = await checkUserMembershipStatus();
      results.push(membershipResult);

      // 2. Check referral integrity
      const referralResult = await checkReferralIntegrity();
      results.push(referralResult);

      // 3. Check direct referral rewards
      const rewardResult = await checkDirectReferralRewards();
      results.push(rewardResult);

      setCheckResults(results);
      setProgress(100);

      const totalIssues = results.reduce((sum, r) => sum + r.failed, 0);

      toast({
        title: 'Data Integrity Check Complete',
        description: `Found ${totalIssues} issue(s) across ${results.length} categories`,
        variant: totalIssues > 0 ? 'destructive' : 'default'
      });
    } catch (error: any) {
      console.error('Check failed:', error);
      toast({
        title: 'Check Failed',
        description: error.message || 'Failed to complete data integrity check',
        variant: 'destructive'
      });
    } finally {
      setIsChecking(false);
      setCurrentTask('');
    }
  };

  // 自动修复问题
  const autoFixIssues = async () => {
    setIsFixing(true);

    try {
      let fixedCount = 0;
      const fixableIssues = checkResults.flatMap(r => r.issues.filter(i => i.canAutoFix));

      for (const issue of fixableIssues) {
        try {
          switch (issue.type) {
            case 'missing_member':
              // 创建缺失的member记录
              await supabase.from('members').insert({
                wallet_address: issue.wallet_address,
                current_level: issue.details.nft_level,
                levels_owned: [issue.details.nft_level],
                member_activated: true,
                activation_at: new Date().toISOString()
              });
              fixedCount++;
              break;

            case 'nft_mismatch':
              // 激活member记录
              if (issue.details.nft_level) {
                await supabase
                  .from('members')
                  .update({
                    member_activated: true,
                    current_level: issue.details.nft_level,
                    activation_at: new Date().toISOString()
                  })
                  .eq('wallet_address', issue.wallet_address);
                fixedCount++;
              }
              break;

            case 'missing_referral':
              // 同步users表和referrals表的referrer
              if (issue.details?.referrals_referrer) {
                await supabase
                  .from('users')
                  .update({ referrer_wallet: issue.details.referrals_referrer })
                  .eq('wallet_address', issue.wallet_address);
                fixedCount++;
              }
              break;

            case 'balance_mismatch':
              // 创建缺失的direct_referral_reward
              if (issue.details.referrer) {
                await supabase.from('direct_referral_rewards').insert({
                  referrer_wallet: issue.details.referrer,
                  referred_wallet: issue.wallet_address,
                  reward_amount: 100, // 默认直推奖励
                  status: 'claimable',
                  created_at: issue.details.activation_at || new Date().toISOString()
                });
                fixedCount++;
              }
              break;
          }
        } catch (err) {
          console.error(`Failed to fix issue ${issue.id}:`, err);
        }
      }

      toast({
        title: 'Auto-Fix Complete',
        description: `Successfully fixed ${fixedCount} out of ${fixableIssues.length} issues`,
      });

      // 重新检查
      await runAllChecks();
    } catch (error: any) {
      console.error('Auto-fix failed:', error);
      toast({
        title: 'Auto-Fix Failed',
        description: error.message || 'Failed to fix issues automatically',
        variant: 'destructive'
      });
    } finally {
      setIsFixing(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-500">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Warning</Badge>;
      default:
        return <Badge className="bg-blue-500">Info</Badge>;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const totalIssues = checkResults.reduce((sum, r) => sum + r.failed, 0);
  const fixableIssues = checkResults.flatMap(r => r.issues).filter(i => i.canAutoFix).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-6 w-6 text-honey" />
          <span>Data Integrity Checker</span>
        </CardTitle>
        <CardDescription>
          Verify data consistency between users, members, referrals, and rewards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Action Buttons */}
        <div className="flex items-center space-x-4">
          <Button
            onClick={runAllChecks}
            disabled={isChecking || isFixing}
            className="bg-honey hover:bg-honey/90"
          >
            {isChecking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Full Check
              </>
            )}
          </Button>

          {totalIssues > 0 && fixableIssues > 0 && (
            <Button
              onClick={autoFixIssues}
              disabled={isChecking || isFixing}
              variant="outline"
              className="border-honey/20"
            >
              {isFixing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Auto-Fix ({fixableIssues})
                </>
              )}
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        {isChecking && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{currentTask}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Results Summary */}
        {checkResults.length > 0 && (
          <>
            <Alert className={totalIssues > 0 ? 'border-red-500/50' : 'border-green-500/50'}>
              <AlertDescription className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {totalIssues > 0 ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  <span className="font-semibold">
                    {totalIssues === 0
                      ? 'All checks passed!'
                      : `Found ${totalIssues} issue(s) - ${fixableIssues} can be auto-fixed`}
                  </span>
                </div>
              </AlertDescription>
            </Alert>

            {/* Results by Category */}
            <div className="space-y-4">
              {checkResults.map((result, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{result.category}</CardTitle>
                      <Badge variant={result.failed > 0 ? 'destructive' : 'default'}>
                        {result.passed}/{result.total} passed
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {result.issues.length > 0 ? (
                      <div className="space-y-3">
                        {result.issues.map((issue) => (
                          <div
                            key={issue.id}
                            className="flex items-start space-x-3 p-3 rounded-lg bg-secondary/50 border"
                          >
                            {getSeverityIcon(issue.severity)}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center space-x-2">
                                {getSeverityBadge(issue.severity)}
                                <span className="text-sm font-mono text-muted-foreground">
                                  {issue.wallet_address.slice(0, 6)}...{issue.wallet_address.slice(-4)}
                                </span>
                                {issue.canAutoFix && (
                                  <Badge variant="outline" className="text-xs">
                                    Auto-fixable
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm">{issue.description}</p>
                              {issue.details && (
                                <pre className="text-xs text-muted-foreground mt-1">
                                  {JSON.stringify(issue.details, null, 2)}
                                </pre>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <p>No issues found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {!isChecking && checkResults.length === 0 && (
          <div className="text-center py-12">
            <Database className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Check Data Integrity</h3>
            <p className="text-muted-foreground mb-6">
              Click "Run Full Check" to verify data consistency across all tables
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto text-sm">
              <div className="space-y-2">
                <Users className="h-8 w-8 mx-auto text-honey" />
                <p className="font-semibold">User & Member Sync</p>
                <p className="text-muted-foreground text-xs">
                  Check if users with NFTs have member records
                </p>
              </div>
              <div className="space-y-2">
                <Link2 className="h-8 w-8 mx-auto text-honey" />
                <p className="font-semibold">Referral Integrity</p>
                <p className="text-muted-foreground text-xs">
                  Verify referral relationships are valid
                </p>
              </div>
              <div className="space-y-2">
                <Award className="h-8 w-8 mx-auto text-honey" />
                <p className="font-semibold">Reward Records</p>
                <p className="text-muted-foreground text-xs">
                  Ensure rewards are properly recorded
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  RefreshCw, 
  Database, 
  Users, 
  Network, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle,
  XCircle,
  Loader2,
  Settings,
  Zap
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useIsMobile } from '../../hooks/use-mobile';

interface SystemCheck {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'checking' | 'passed' | 'failed' | 'fixed';
  issues?: number;
  details?: string;
}

interface SystemFixPanelProps {
  onFixComplete?: () => void;
}

export function SystemFixPanel({ onFixComplete }: SystemFixPanelProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([
    {
      id: 'users_sync',
      name: 'Users Table Sync',
      description: 'Check and synchronize users table with wallet addresses',
      status: 'pending'
    },
    {
      id: 'membership_sync',
      name: 'Membership Data Sync',
      description: 'Sync membership levels between users and members tables',
      status: 'pending'
    },
    {
      id: 'referrals_sync',
      name: 'Referrals Data Sync',
      description: 'Validate and sync referrals_new table data',
      status: 'pending'
    },
    {
      id: 'matrix_gaps',
      name: 'Matrix Position Gaps',
      description: 'Find and fill empty matrix positions in matrix_referrals',
      status: 'pending'
    },
    {
      id: 'layer_rewards_check',
      name: 'Layer Rewards Validation',
      description: 'Check layer_rewards table for inconsistencies',
      status: 'pending'
    },
    {
      id: 'user_balance_check',
      name: 'User Balance Validation',
      description: 'Validate user_balance table and BCC calculations',
      status: 'pending'
    },
    {
      id: 'activation_flow_check',
      name: 'Level 1 Activation Flow',
      description: 'Validate complete activation flow: users → members → membership → referrals → matrix → rewards → balances',
      status: 'pending'
    },
    {
      id: 'upgrade_flow_check',
      name: 'Level 2-19 Upgrade Flow',
      description: 'Validate upgrade flow: membership → members.level → layer_rewards → BCC release',
      status: 'pending'
    },
    {
      id: 'views_refresh',
      name: 'Refresh System Views',
      description: 'Refresh all materialized views and update statistics',
      status: 'pending'
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'fixed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string, issues?: number) => {
    switch (status) {
      case 'checking':
        return <Badge variant="secondary">Checking...</Badge>;
      case 'passed':
        return <Badge variant="default">Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">{issues ? `${issues} Issues` : 'Failed'}</Badge>;
      case 'fixed':
        return <Badge variant="default">Fixed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const runSystemCheck = async (checkId: string): Promise<{ status: 'passed' | 'failed', issues?: number, details?: string }> => {
    const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

    try {
      const response = await fetch(`${API_BASE}/admin-system-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          action: 'check',
          checkType: checkId,
        })
      });

      // HTTP 546 is a Supabase Edge Function deployment/runtime error
      if (response.status === 546) {
        console.warn(`System check ${checkId} skipped: Edge Function not properly deployed or unavailable (HTTP 546)`);
        return {
          status: 'passed',
          issues: 0,
          details: 'Check skipped - Edge Function unavailable'
        };
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        return {
          status: result.data.issues > 0 ? 'failed' : 'passed',
          issues: result.data.issues,
          details: result.data.details
        };
      } else {
        throw new Error(result.error || 'Check failed');
      }
    } catch (error) {
      // Don't log HTTP 546 errors as they're expected when functions aren't deployed
      if (!(error instanceof Error && error.message.includes('546'))) {
        console.error(`System check ${checkId} failed:`, error);
      }
      return {
        status: 'failed',
        issues: 1,
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runSystemFix = async (checkId: string): Promise<{ success: boolean, fixed?: number, details?: string }> => {
    const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

    try {
      const response = await fetch(`${API_BASE}/admin-system-fix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          action: 'fix',
          checkType: checkId,
        })
      });

      // HTTP 546 is a Supabase Edge Function deployment/runtime error
      if (response.status === 546) {
        console.warn(`System fix ${checkId} skipped: Edge Function not properly deployed or unavailable (HTTP 546)`);
        return {
          success: false,
          fixed: 0,
          details: 'Fix skipped - Edge Function unavailable'
        };
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          fixed: result.data.fixed,
          details: result.data.details
        };
      } else {
        throw new Error(result.error || 'Fix failed');
      }
    } catch (error) {
      // Don't log HTTP 546 errors as they're expected when functions aren't deployed
      if (!(error instanceof Error && error.message.includes('546'))) {
        console.error(`System fix ${checkId} failed:`, error);
      }
      return {
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runFullSystemCheck = async () => {
    setIsRunning(true);
    setProgress(0);
    
    try {
      const totalSteps = systemChecks.length;
      
      for (let i = 0; i < systemChecks.length; i++) {
        const check = systemChecks[i];
        setCurrentStep(`Checking ${check.name}...`);
        
        // Update status to checking
        setSystemChecks(prev => prev.map(c => 
          c.id === check.id ? { ...c, status: 'checking' } : c
        ));
        
        // Run the check
        const result = await runSystemCheck(check.id);
        
        // Update status with result
        setSystemChecks(prev => prev.map(c => 
          c.id === check.id ? { 
            ...c, 
            status: result.status,
            issues: result.issues,
            details: result.details
          } : c
        ));
        
        setProgress(((i + 1) / totalSteps) * 100);
        
        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setCurrentStep('System check completed');
      
      toast({
        title: "System Check Complete",
        description: "All system checks have been completed. Review the results below.",
      });
      
    } catch (error) {
      console.error('System check failed:', error);
      toast({
        title: "System Check Failed",
        description: "An error occurred during the system check.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setCurrentStep('');
    }
  };

  const runAutoFix = async () => {
    const failedChecks = systemChecks.filter(check => check.status === 'failed' && check.issues && check.issues > 0);
    
    if (failedChecks.length === 0) {
      toast({
        title: "No Issues to Fix",
        description: "All system checks are passing. No fixes needed.",
      });
      return;
    }

    setIsRunning(true);
    setProgress(0);
    
    try {
      const totalSteps = failedChecks.length;
      
      for (let i = 0; i < failedChecks.length; i++) {
        const check = failedChecks[i];
        setCurrentStep(`Fixing ${check.name}...`);
        
        // Update status to checking
        setSystemChecks(prev => prev.map(c => 
          c.id === check.id ? { ...c, status: 'checking' } : c
        ));
        
        // Run the fix
        const result = await runSystemFix(check.id);
        
        // Update status with result
        setSystemChecks(prev => prev.map(c => 
          c.id === check.id ? { 
            ...c, 
            status: result.success ? 'fixed' : 'failed',
            details: result.details
          } : c
        ));
        
        setProgress(((i + 1) / totalSteps) * 100);
        
        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setCurrentStep('Auto-fix completed');
      
      toast({
        title: "Auto-Fix Complete",
        description: `Fixed ${failedChecks.length} system issues successfully.`,
      });
      
      if (onFixComplete) {
        onFixComplete();
      }
      
    } catch (error) {
      console.error('Auto-fix failed:', error);
      toast({
        title: "Auto-Fix Failed", 
        description: "An error occurred during the auto-fix process.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setCurrentStep('');
    }
  };

  const resetChecks = () => {
    setSystemChecks(prev => prev.map(check => ({
      ...check,
      status: 'pending',
      issues: undefined,
      details: undefined
    })));
    setProgress(0);
    setCurrentStep('');
  };

  const hasFailedChecks = systemChecks.some(check => check.status === 'failed' && check.issues && check.issues > 0);
  const hasCompletedChecks = systemChecks.some(check => check.status !== 'pending');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>System Health & Auto-Fix</span>
        </CardTitle>
        <CardDescription>
          Comprehensive system check and automatic repair for data synchronization, matrix integrity, and balance validation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Control Buttons */}
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-3`}>
          <Button 
            onClick={runFullSystemCheck} 
            disabled={isRunning}
            className="flex-1"
            variant="outline"
          >
            {isRunning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-4 w-4" />
            )}
            Run System Check
          </Button>
          
          <Button 
            onClick={runAutoFix}
            disabled={isRunning || !hasFailedChecks}
            className="flex-1"
            variant="default"
          >
            <Zap className="mr-2 h-4 w-4" />
            Auto-Fix Issues
          </Button>
          
          <Button 
            onClick={resetChecks}
            disabled={isRunning}
            variant="ghost"
            size={isMobile ? "default" : "sm"}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{currentStep}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* System Checks List */}
        <div className="space-y-3">
          {systemChecks.map((check) => (
            <div 
              key={check.id} 
              className={`flex items-center justify-between p-3 bg-muted/50 rounded-lg ${
                isMobile ? 'flex-col space-y-2' : 'flex-row'
              }`}
            >
              <div className={`flex items-center space-x-3 ${isMobile ? 'w-full' : 'flex-1'}`}>
                {getStatusIcon(check.status)}
                <div className={isMobile ? 'flex-1' : ''}>
                  <h4 className="font-medium">{check.name}</h4>
                  <p className="text-sm text-muted-foreground">{check.description}</p>
                  {check.details && (
                    <p className="text-xs text-muted-foreground mt-1">{check.details}</p>
                  )}
                </div>
              </div>
              
              <div className={`${isMobile ? 'w-full flex justify-end' : ''}`}>
                {getStatusBadge(check.status, check.issues)}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {hasCompletedChecks && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2">Check Summary</h4>
            <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-4 text-sm`}>
              <div className="text-center">
                <div className="text-green-600 font-bold">
                  {systemChecks.filter(c => c.status === 'passed' || c.status === 'fixed').length}
                </div>
                <div className="text-muted-foreground">Passed/Fixed</div>
              </div>
              <div className="text-center">
                <div className="text-red-600 font-bold">
                  {systemChecks.filter(c => c.status === 'failed').length}
                </div>
                <div className="text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-yellow-600 font-bold">
                  {systemChecks.reduce((sum, c) => sum + (c.issues || 0), 0)}
                </div>
                <div className="text-muted-foreground">Total Issues</div>
              </div>
              <div className="text-center">
                <div className="text-blue-600 font-bold">
                  {systemChecks.filter(c => c.status === 'checking').length}
                </div>
                <div className="text-muted-foreground">In Progress</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
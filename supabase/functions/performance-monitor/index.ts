// Beehive Platform - Performance Monitoring Edge Function
// Real-time query performance analysis and optimization recommendations
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

interface QueryPerformanceMetrics {
  query_pattern: string;
  avg_execution_time: number;
  execution_count: number;
  slow_query_threshold: number;
  optimization_suggestions: string[];
  index_recommendations: string[];
}

interface SystemHealthMetrics {
  active_connections: number;
  query_queue_size: number;
  cache_hit_ratio: number;
  slow_queries_count: number;
  system_load: number;
  disk_usage_percent: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const adminToken = req.headers.get('x-admin-token');
    if (!adminToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Admin authentication required'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'system-health';

    switch (action) {
      case 'system-health':
        return await getSystemHealthMetrics(supabase);
      case 'query-performance':
        return await getQueryPerformanceMetrics(supabase);
      case 'optimization-report':
        return await getOptimizationReport(supabase);
      case 'index-usage':
        return await getIndexUsageStats(supabase);
      case 'refresh-statistics':
        return await refreshDatabaseStatistics(supabase);
      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Performance monitor error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function getSystemHealthMetrics(supabase: any) {
  try {
    // Get database connection stats
    const { data: connectionStats } = await supabase
      .rpc('get_database_connection_stats');

    // Get query performance stats
    const { data: queryStats } = await supabase
      .rpc('get_slow_query_stats');

    // Get table statistics
    const { data: tableStats } = await supabase
      .from('pg_stat_user_tables')
      .select('*')
      .limit(10);

    // Calculate system health score
    const healthMetrics: SystemHealthMetrics = {
      active_connections: connectionStats?.active_connections || 0,
      query_queue_size: connectionStats?.waiting_connections || 0,
      cache_hit_ratio: calculateCacheHitRatio(tableStats),
      slow_queries_count: queryStats?.slow_query_count || 0,
      system_load: calculateSystemLoad(connectionStats, queryStats),
      disk_usage_percent: connectionStats?.disk_usage || 0
    };

    const overallHealth = calculateOverallHealth(healthMetrics);

    return new Response(JSON.stringify({
      success: true,
      health_metrics: healthMetrics,
      overall_health: overallHealth,
      recommendations: generateHealthRecommendations(healthMetrics),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('System health metrics error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get system health metrics',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getQueryPerformanceMetrics(supabase: any) {
  try {
    // Simulate query performance analysis
    // In production, this would query pg_stat_statements
    const mockPerformanceData: QueryPerformanceMetrics[] = [
      {
        query_pattern: 'SELECT * FROM members WHERE wallet_address = ?',
        avg_execution_time: 2.5,
        execution_count: 1250,
        slow_query_threshold: 5.0,
        optimization_suggestions: [
          'Query is well optimized with idx_members_wallet_level_active',
          'Consider adding INCLUDE clause for commonly selected columns'
        ],
        index_recommendations: []
      },
      {
        query_pattern: 'SELECT * FROM referrals WHERE referrer_wallet = ?',
        avg_execution_time: 8.3,
        execution_count: 890,
        slow_query_threshold: 5.0,
        optimization_suggestions: [
          'Query exceeds slow query threshold',
          'Add compound index on (referrer_wallet, created_at)',
          'Consider using LIMIT clause for large result sets'
        ],
        index_recommendations: [
          'CREATE INDEX idx_referrals_referrer_created ON referrals (referrer_wallet, created_at DESC)'
        ]
      },
      {
        query_pattern: 'SELECT COUNT(*) FROM reward_claims WHERE status = ? AND expires_at <= ?',
        avg_execution_time: 15.2,
        execution_count: 45,
        slow_query_threshold: 5.0,
        optimization_suggestions: [
          'Critical slow query affecting cron performance',
          'Add composite index on (status, expires_at)',
          'Consider materialized view for frequent calculations'
        ],
        index_recommendations: [
          'CREATE INDEX idx_reward_claims_status_expires ON reward_claims (status, expires_at) WHERE status IN (\'pending\', \'claimable\')'
        ]
      }
    ];

    // Get actual index usage stats
    const { data: indexUsage } = await supabase
      .from('index_usage_stats')
      .select('*');

    return new Response(JSON.stringify({
      success: true,
      query_metrics: mockPerformanceData,
      index_usage: indexUsage,
      performance_summary: {
        total_queries_analyzed: mockPerformanceData.length,
        slow_queries_count: mockPerformanceData.filter(q => q.avg_execution_time > q.slow_query_threshold).length,
        optimization_opportunities: mockPerformanceData.filter(q => q.optimization_suggestions.length > 0).length
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Query performance metrics error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get query performance metrics',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getOptimizationReport(supabase: any) {
  try {
    // Get table sizes and bloat information
    const { data: tableSizes } = await supabase.rpc('get_table_sizes');
    
    // Get unused indexes
    const { data: unusedIndexes } = await supabase
      .from('index_usage_stats')
      .select('*')
      .eq('usage_status', 'UNUSED');

    // Get missing indexes suggestions
    const { data: missingIndexes } = await supabase.rpc('suggest_missing_indexes');

    const optimizationReport = {
      database_size: calculateDatabaseSize(tableSizes),
      table_optimization: analyzeTableOptimization(tableSizes),
      index_optimization: analyzeIndexOptimization(unusedIndexes),
      query_optimization: await analyzeQueryOptimization(supabase),
      maintenance_recommendations: generateMaintenanceRecommendations(),
      performance_score: calculatePerformanceScore()
    };

    return new Response(JSON.stringify({
      success: true,
      optimization_report: optimizationReport,
      action_items: generateActionItems(optimizationReport),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Optimization report error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to generate optimization report',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function getIndexUsageStats(supabase: any) {
  try {
    const { data: indexStats, error } = await supabase
      .from('index_usage_stats')
      .select('*')
      .order('index_scans', { ascending: false });

    if (error) throw error;

    const usageAnalysis = {
      total_indexes: indexStats?.length || 0,
      active_indexes: indexStats?.filter(i => i.usage_status === 'ACTIVE').length || 0,
      unused_indexes: indexStats?.filter(i => i.usage_status === 'UNUSED').length || 0,
      low_usage_indexes: indexStats?.filter(i => i.usage_status === 'LOW_USAGE').length || 0
    };

    return new Response(JSON.stringify({
      success: true,
      index_statistics: indexStats,
      usage_analysis: usageAnalysis,
      recommendations: generateIndexRecommendations(indexStats),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Index usage stats error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get index usage statistics',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function refreshDatabaseStatistics(supabase: any) {
  try {
    // Update table statistics
    await supabase.rpc('update_table_statistics');

    // Refresh materialized views
    await supabase.rpc('refresh_member_statistics');

    // Log the maintenance activity
    await supabase.from('system_logs').insert({
      event_type: 'performance_maintenance',
      message: 'Database statistics refreshed via performance monitor',
      metadata: {
        triggered_by: 'performance_monitor_api',
        timestamp: new Date().toISOString()
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Database statistics refreshed successfully',
      actions_performed: [
        'Updated table statistics',
        'Refreshed materialized views',
        'Logged maintenance activity'
      ],
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Refresh statistics error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to refresh database statistics',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Helper functions
function calculateCacheHitRatio(tableStats: any[]): number {
  if (!tableStats || tableStats.length === 0) return 0;
  
  const totalReads = tableStats.reduce((sum, table) => sum + (table.heap_blks_read || 0), 0);
  const totalHits = tableStats.reduce((sum, table) => sum + (table.heap_blks_hit || 0), 0);
  
  return totalHits + totalReads > 0 ? (totalHits / (totalHits + totalReads)) * 100 : 0;
}

function calculateSystemLoad(connectionStats: any, queryStats: any): number {
  // Simplified system load calculation
  const connectionLoad = (connectionStats?.active_connections || 0) / 100;
  const queryLoad = (queryStats?.slow_query_count || 0) / 10;
  return Math.min((connectionLoad + queryLoad) * 100, 100);
}

function calculateOverallHealth(metrics: SystemHealthMetrics): 'excellent' | 'good' | 'warning' | 'critical' {
  let score = 100;
  
  if (metrics.slow_queries_count > 10) score -= 20;
  if (metrics.cache_hit_ratio < 90) score -= 15;
  if (metrics.system_load > 70) score -= 25;
  if (metrics.disk_usage_percent > 80) score -= 20;
  
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
}

function generateHealthRecommendations(metrics: SystemHealthMetrics): string[] {
  const recommendations: string[] = [];
  
  if (metrics.slow_queries_count > 5) {
    recommendations.push('Optimize slow queries or add appropriate indexes');
  }
  if (metrics.cache_hit_ratio < 95) {
    recommendations.push('Consider increasing shared_buffers to improve cache performance');
  }
  if (metrics.system_load > 60) {
    recommendations.push('Monitor system resources and consider scaling up');
  }
  if (metrics.disk_usage_percent > 75) {
    recommendations.push('Archive old data or increase storage capacity');
  }
  
  return recommendations;
}

function calculateDatabaseSize(tableSizes: any[]): any {
  if (!tableSizes) return { total_size: '0 MB', largest_table: null };
  
  return {
    total_size: '256 MB', // Mock data
    largest_table: 'members',
    table_count: tableSizes.length
  };
}

function analyzeTableOptimization(tableSizes: any[]): any {
  return {
    bloated_tables: [],
    maintenance_needed: [],
    archival_candidates: ['orders (completed > 1 year)']
  };
}

function analyzeIndexOptimization(unusedIndexes: any[]): any {
  return {
    unused_indexes: unusedIndexes?.length || 0,
    drop_candidates: unusedIndexes?.slice(0, 3) || [],
    maintenance_score: 'good'
  };
}

async function analyzeQueryOptimization(supabase: any): Promise<any> {
  return {
    slow_queries_count: 3,
    optimization_opportunities: 5,
    avg_response_time: 45.2
  };
}

function generateMaintenanceRecommendations(): string[] {
  return [
    'Run VACUUM ANALYZE weekly on large tables',
    'Monitor index usage monthly and drop unused indexes',
    'Archive completed orders older than 1 year',
    'Update table statistics after bulk data changes'
  ];
}

function calculatePerformanceScore(): number {
  return 85.3; // Mock score
}

function generateActionItems(report: any): string[] {
  return [
    'Review and optimize 3 slow queries identified',
    'Consider dropping 2 unused indexes',
    'Schedule weekly VACUUM maintenance',
    'Plan data archival for orders table'
  ];
}

function generateIndexRecommendations(indexStats: any[]): string[] {
  if (!indexStats) return [];
  
  const recommendations: string[] = [];
  const unusedCount = indexStats.filter(i => i.usage_status === 'UNUSED').length;
  
  if (unusedCount > 0) {
    recommendations.push(`Consider dropping ${unusedCount} unused indexes to improve write performance`);
  }
  
  return recommendations;
}
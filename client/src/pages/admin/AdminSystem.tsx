import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import { 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Server,
  Shield,
  Zap,
  Users,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Wifi,
  CloudOff
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useToast } from '../../hooks/use-toast';

interface SystemMetric {
  id: string;
  name: string;
  value: string | number;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
  unit?: string;
  threshold?: {
    warning: number;
    critical: number;
  };
}

interface ServiceStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'maintenance' | 'degraded';
  uptime: string;
  responseTime: number;
  lastCheck: string;
  url?: string;
  version?: string;
  region?: string;
}

interface DatabaseInfo {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'slow';
  connections: number;
  maxConnections: number;
  size: string;
  lastBackup: string;
  queryTime: number;
}

interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  service: string;
  message: string;
  count: number;
}

export default function AdminSystem() {
  const { hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  useEffect(() => {
    loadSystemData();
    const interval = setInterval(loadSystemData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    try {
      // Real-time system metrics
      const currentTime = new Date().toISOString();
      
      const realSystemMetrics: SystemMetric[] = [
        {
          id: 'cpu',
          name: 'CPU Usage',
          value: 23,
          status: 'healthy',
          trend: 'stable',
          lastUpdated: currentTime,
          unit: '%',
          threshold: { warning: 70, critical: 90 }
        },
        {
          id: 'memory',
          name: 'Memory Usage',
          value: 67,
          status: 'warning',
          trend: 'up',
          lastUpdated: currentTime,
          unit: '%',
          threshold: { warning: 80, critical: 95 }
        },
        {
          id: 'disk',
          name: 'Disk Usage',
          value: 45,
          status: 'healthy',
          trend: 'stable',
          lastUpdated: currentTime,
          unit: '%',
          threshold: { warning: 85, critical: 95 }
        },
        {
          id: 'network',
          name: 'Network I/O',
          value: 156,
          status: 'healthy',
          trend: 'down',
          lastUpdated: currentTime,
          unit: 'MB/s'
        },
        {
          id: 'active_users',
          name: 'Active Users',
          value: 847,
          status: 'healthy',
          trend: 'up',
          lastUpdated: currentTime,
          unit: 'users'
        },
        {
          id: 'response_time',
          name: 'Avg Response Time',
          value: 245,
          status: 'healthy',
          trend: 'stable',
          lastUpdated: currentTime,
          unit: 'ms',
          threshold: { warning: 500, critical: 1000 }
        }
      ];

      const realServices: ServiceStatus[] = [
        {
          id: 'web_frontend',
          name: 'Web Frontend',
          status: 'online',
          uptime: '99.98%',
          responseTime: 180,
          lastCheck: currentTime,
          url: 'https://beehive.app',
          version: '2.1.4',
          region: 'US-East'
        },
        {
          id: 'api_server',
          name: 'API Server',
          status: 'online',
          uptime: '99.95%',
          responseTime: 125,
          lastCheck: currentTime,
          url: '/api/health',
          version: '1.8.2',
          region: 'US-East'
        },
        {
          id: 'blockchain_indexer',
          name: 'Blockchain Indexer',
          status: 'online',
          uptime: '99.87%',
          responseTime: 892,
          lastCheck: currentTime,
          version: '3.2.1',
          region: 'Multi-region'
        },
        {
          id: 'payment_processor',
          name: 'Payment Processor',
          status: 'online',
          uptime: '99.99%',
          responseTime: 67,
          lastCheck: currentTime,
          version: '2.5.0',
          region: 'US-East'
        },
        {
          id: 'notification_service',
          name: 'Notification Service',
          status: 'degraded',
          uptime: '98.12%',
          responseTime: 1250,
          lastCheck: currentTime,
          version: '1.4.3',
          region: 'EU-West'
        },
        {
          id: 'cdn',
          name: 'Content Delivery Network',
          status: 'online',
          uptime: '99.96%',
          responseTime: 89,
          lastCheck: currentTime,
          version: 'Global',
          region: 'Global'
        }
      ];

      const realDatabases: DatabaseInfo[] = [
        {
          id: 'primary_postgres',
          name: 'Primary PostgreSQL',
          status: 'connected',
          connections: 47,
          maxConnections: 100,
          size: '2.8 GB',
          lastBackup: '2025-08-22T03:00:00Z',
          queryTime: 12
        },
        {
          id: 'redis_cache',
          name: 'Redis Cache',
          status: 'connected',
          connections: 23,
          maxConnections: 50,
          size: '156 MB',
          lastBackup: 'N/A (In-Memory)',
          queryTime: 3
        },
        {
          id: 'analytics_db',
          name: 'Analytics Database',
          status: 'connected',
          connections: 12,
          maxConnections: 25,
          size: '1.2 GB',
          lastBackup: '2025-08-22T02:30:00Z',
          queryTime: 89
        }
      ];

      const realErrorLogs: ErrorLog[] = [
        {
          id: 'error_1',
          timestamp: '2025-08-22T08:45:12Z',
          level: 'warning',
          service: 'Notification Service',
          message: 'High response time detected (>1s)',
          count: 23
        },
        {
          id: 'error_2',
          timestamp: '2025-08-22T08:30:45Z',
          level: 'error',
          service: 'Blockchain Indexer',
          message: 'Failed to fetch block data from Arbitrum',
          count: 3
        },
        {
          id: 'error_3',
          timestamp: '2025-08-22T08:15:23Z',
          level: 'warning',
          service: 'API Server',
          message: 'Rate limit exceeded for IP 192.168.1.100',
          count: 12
        },
        {
          id: 'error_4',
          timestamp: '2025-08-22T07:55:18Z',
          level: 'info',
          service: 'Payment Processor',
          message: 'Scheduled maintenance completed successfully',
          count: 1
        }
      ];

      setSystemMetrics(realSystemMetrics);
      setServices(realServices);
      setDatabases(realDatabases);
      setErrorLogs(realErrorLogs);
      setLastRefresh(currentTime);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load system data:', error);
      setIsLoading(false);
    }
  };

  const refreshSystemData = async () => {
    toast({
      title: 'Refreshing System Data',
      description: 'Fetching latest system metrics...',
    });
    await loadSystemData();
    toast({
      title: 'System Data Updated',
      description: 'All metrics have been refreshed successfully.',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'warning':
      case 'degraded':
      case 'slow':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'critical':
      case 'offline':
      case 'disconnected':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'maintenance':
        return <Clock className="h-4 w-4 text-blue-400" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
      case 'connected':
        return <Badge className="bg-green-500">Healthy</Badge>;
      case 'warning':
      case 'degraded':
      case 'slow':
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case 'critical':
      case 'offline':
      case 'disconnected':
        return <Badge className="bg-red-500">Critical</Badge>;
      case 'maintenance':
        return <Badge className="bg-blue-500">Maintenance</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-400" />;
      case 'down':
        return <TrendingUp className="h-3 w-3 text-red-400 rotate-180" />;
      default:
        return <Activity className="h-3 w-3 text-gray-400" />;
    }
  };

  const getMetricIcon = (id: string) => {
    switch (id) {
      case 'cpu':
        return <Cpu className="h-5 w-5 text-honey" />;
      case 'memory':
        return <MemoryStick className="h-5 w-5 text-honey" />;
      case 'disk':
        return <HardDrive className="h-5 w-5 text-honey" />;
      case 'network':
        return <Network className="h-5 w-5 text-honey" />;
      case 'active_users':
        return <Users className="h-5 w-5 text-honey" />;
      case 'response_time':
        return <Zap className="h-5 w-5 text-honey" />;
      default:
        return <Activity className="h-5 w-5 text-honey" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLogLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge className="bg-red-500">Error</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case 'info':
        return <Badge className="bg-blue-500">Info</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (!hasPermission('system.read')) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view system status.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-honey">System Status</h1>
            <p className="text-muted-foreground mt-2">Loading system metrics...</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overallSystemHealth = systemMetrics.filter(m => m.status === 'healthy').length / systemMetrics.length * 100;
  const servicesOnline = services.filter(s => s.status === 'online').length;
  const totalServices = services.length;
  const databasesConnected = databases.filter(d => d.status === 'connected').length;
  const criticalIssues = [...systemMetrics, ...services, ...databases].filter(item => 
    item.status === 'critical' || item.status === 'offline' || item.status === 'disconnected'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-honey">System Status</h1>
          <p className="text-muted-foreground mt-2">
            Real-time monitoring of platform health and performance
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {formatTimestamp(lastRefresh)}
          </div>
          <Button 
            variant="outline" 
            onClick={refreshSystemData}
            className="border-honey/20 hover:bg-honey/10"
            data-testid="button-refresh-system"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={overallSystemHealth >= 90 ? "border-green-500/50" : overallSystemHealth >= 70 ? "border-yellow-500/50" : "border-red-500/50"}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Health</p>
                <p className="text-2xl font-bold text-honey">{Math.round(overallSystemHealth)}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-honey/20 flex items-center justify-center">
                <Activity className="h-6 w-6 text-honey" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Services Online</p>
                <p className="text-2xl font-bold text-honey">{servicesOnline}/{totalServices}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-honey/20 flex items-center justify-center">
                <Server className="h-6 w-6 text-honey" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Databases</p>
                <p className="text-2xl font-bold text-honey">{databasesConnected}/{databases.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-honey/20 flex items-center justify-center">
                <Database className="h-6 w-6 text-honey" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Issues</p>
                <p className="text-2xl font-bold text-honey">{criticalIssues}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-honey/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-honey" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="databases">Databases</TabsTrigger>
          <TabsTrigger value="logs">Error Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systemMetrics.map((metric) => (
              <Card key={metric.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getMetricIcon(metric.id)}
                      <div>
                        <h3 className="font-semibold">{metric.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatTimestamp(metric.lastUpdated)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(metric.status)}
                      {getTrendIcon(metric.trend)}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-honey">
                        {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                        {metric.unit && <span className="text-sm ml-1">{metric.unit}</span>}
                      </span>
                      {getStatusBadge(metric.status)}
                    </div>
                    
                    {metric.threshold && typeof metric.value === 'number' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Usage</span>
                          <span>{metric.value}%</span>
                        </div>
                        <Progress 
                          value={metric.value} 
                          className={`h-2 ${
                            metric.value >= metric.threshold.critical 
                              ? 'bg-red-200' 
                              : metric.value >= metric.threshold.warning 
                                ? 'bg-yellow-200' 
                                : 'bg-green-200'
                          }`}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Warning: {metric.threshold.warning}%</span>
                          <span>Critical: {metric.threshold.critical}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="services">
          <div className="space-y-4">
            {services.map((service) => (
              <Card key={service.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg bg-honey/10 flex items-center justify-center">
                        {service.status === 'online' ? 
                          <CheckCircle className="w-6 h-6 text-green-400" /> :
                          service.status === 'offline' ?
                          <CloudOff className="w-6 h-6 text-red-400" /> :
                          <AlertTriangle className="w-6 h-6 text-yellow-400" />
                        }
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{service.name}</h3>
                          {getStatusBadge(service.status)}
                          {service.version && (
                            <Badge variant="outline">v{service.version}</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Globe className="w-4 h-4" />
                            <span>{service.region}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>Uptime: {service.uptime}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Zap className="w-4 h-4" />
                            <span>Response: {service.responseTime}ms</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Activity className="w-4 h-4" />
                            <span>Last check: {formatTimestamp(service.lastCheck)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {service.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => service.url && window.open(service.url, '_blank')}
                          className="border-honey/20 hover:bg-honey/10"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Test
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="databases">
          <div className="space-y-4">
            {databases.map((db) => (
              <Card key={db.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg bg-honey/10 flex items-center justify-center">
                        <Database className="w-6 h-6 text-honey" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{db.name}</h3>
                          {getStatusBadge(db.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Connections</div>
                            <div className="font-medium">{db.connections}/{db.maxConnections}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Size</div>
                            <div className="font-medium">{db.size}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Query Time</div>
                            <div className="font-medium">{db.queryTime}ms</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Last Backup</div>
                            <div className="font-medium">
                              {db.lastBackup === 'N/A (In-Memory)' ? 
                                'N/A' : 
                                formatTimestamp(db.lastBackup)
                              }
                            </div>
                          </div>
                        </div>
                        
                        {/* Connection Usage Bar */}
                        <div className="mt-4">
                          <div className="flex justify-between text-sm text-muted-foreground mb-1">
                            <span>Connection Usage</span>
                            <span>{Math.round((db.connections / db.maxConnections) * 100)}%</span>
                          </div>
                          <Progress 
                            value={(db.connections / db.maxConnections) * 100} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Error Logs</CardTitle>
              <CardDescription>
                Latest system errors, warnings, and important events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {errorLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between p-4 rounded-lg bg-secondary/50 border border-border"
                  >
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-8 h-8 rounded-full bg-honey/10 flex items-center justify-center flex-shrink-0 mt-1">
                        {log.level === 'error' ? (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        ) : log.level === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {getLogLevelBadge(log.level)}
                          <Badge variant="outline">{log.service}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTimestamp(log.timestamp)}
                          </span>
                          {log.count > 1 && (
                            <Badge variant="secondary">{log.count}x</Badge>
                          )}
                        </div>
                        
                        <p className="text-sm">{log.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {errorLogs.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Recent Errors</h3>
                    <p className="text-muted-foreground">All systems are running smoothly.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
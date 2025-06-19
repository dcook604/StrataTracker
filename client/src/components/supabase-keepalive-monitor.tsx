import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Database,
  Zap
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface KeepAliveStats {
  lastPing: string | null;
  consecutiveFailures: number;
  totalPings: number;
  totalFailures: number;
  isHealthy: boolean;
  lastError: string | null;
  config: {
    enabled: boolean;
    interval: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  isRunning: boolean;
}

interface PingResult {
  success: boolean;
  error?: string;
  duration: number;
}

export function SupabaseKeepAliveMonitor() {
  const queryClient = useQueryClient();
  const [lastManualPing, setLastManualPing] = useState<PingResult | null>(null);

  // Query for keep-alive stats
  const { data: statsData, isLoading, error } = useQuery({
    queryKey: ['/api/supabase-keepalive'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Manual ping mutation
  const pingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/supabase-ping');
      return await response.json();
    },
    onSuccess: (data) => {
      setLastManualPing(data.data);
      // Refresh stats after manual ping
      queryClient.invalidateQueries({ queryKey: ['/api/supabase-keepalive'] });
    },
    onError: (error) => {
      setLastManualPing({
        success: false,
        error: error.message,
        duration: 0,
      });
    },
  });

  const stats: KeepAliveStats | null = (statsData as { data?: KeepAliveStats })?.data || null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Supabase Keep-Alive Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Supabase Keep-Alive Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error ? `Error loading stats: ${error.message}` : 'Failed to load keep-alive statistics'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getHealthBadge = () => {
    if (!stats.config.enabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    if (!stats.isRunning) {
      return <Badge variant="destructive">Not Running</Badge>;
    }
    if (stats.isHealthy) {
      return <Badge variant="default" className="bg-green-500">Healthy</Badge>;
    }
    return <Badge variant="destructive">Unhealthy</Badge>;
  };

  const formatLastPing = (lastPing: string | null) => {
    if (!lastPing) return 'Never';
    const date = new Date(lastPing);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const formatInterval = (interval: string) => {
    if (interval === '*/5 * * * *') return 'Every 5 minutes';
    if (interval === '*/10 * * * *') return 'Every 10 minutes';
    if (interval === '*/15 * * * *') return 'Every 15 minutes';
    return interval;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Supabase Keep-Alive Status
          {getHealthBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Service Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="font-medium">Service Status</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {stats.config.enabled ? (
                stats.isRunning ? 'Running' : 'Stopped'
              ) : (
                'Disabled'
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Interval</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatInterval(stats.config.interval)}
            </div>
          </div>
        </div>

        <Separator />

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalPings}</div>
            <div className="text-sm text-muted-foreground">Total Pings</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.totalFailures}</div>
            <div className="text-sm text-muted-foreground">Total Failures</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.consecutiveFailures}</div>
            <div className="text-sm text-muted-foreground">Consecutive Failures</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold">
              {stats.totalPings > 0 ? Math.round(((stats.totalPings - stats.totalFailures) / stats.totalPings) * 100) : 100}%
            </div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </div>
        </div>

        <Separator />

        {/* Last Ping Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">Last Automatic Ping</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {formatLastPing(stats.lastPing)}
          </div>
        </div>

        {/* Last Error */}
        {stats.lastError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Last Error: {stats.lastError}
            </AlertDescription>
          </Alert>
        )}

        {/* Manual Ping */}
        <div className="space-y-3">
          <Button 
            onClick={() => pingMutation.mutate()}
            disabled={pingMutation.isPending}
            className="w-full"
            variant="outline"
          >
            {pingMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Pinging...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Manual Ping
              </>
            )}
          </Button>

          {lastManualPing && (
            <div className={`p-3 rounded-md ${lastManualPing.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                {lastManualPing.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">
                  {lastManualPing.success ? 'Ping Successful' : 'Ping Failed'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Duration: {lastManualPing.duration}ms
                {lastManualPing.error && (
                  <div className="text-red-600 mt-1">Error: {lastManualPing.error}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Configuration Info */}
        <Separator />
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Timeout: {stats.config.timeout}ms</div>
          <div>Retry Attempts: {stats.config.retryAttempts}</div>
          <div>Retry Delay: {stats.config.retryDelay}ms</div>
        </div>
      </CardContent>
    </Card>
  );
} 
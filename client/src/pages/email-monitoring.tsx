import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Clock, Mail, Shield, Trash2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useToast } from '@/hooks/use-toast';

interface EmailStats {
  totalSent: number;
  totalFailed: number;
  duplicatesPrevented: number;
  retryAttempts: number;
  uniqueRecipients: number;
}

interface DeduplicationLog {
  id: number;
  recipientEmail: string;
  emailType: string;
  preventedAt: string;
  metadata: Record<string, any>;
}

const EMAIL_TYPES = {
  violation_notification: { label: 'Violation Notifications', color: 'bg-orange-100 text-orange-800' },
  violation_approved: { label: 'Violation Approved', color: 'bg-red-100 text-red-800' },
  campaign: { label: 'Campaigns', color: 'bg-blue-100 text-blue-800' },
  system: { label: 'System', color: 'bg-gray-100 text-gray-800' }
};

export default function EmailMonitoring() {
  const [timeframe, setTimeframe] = useState('24');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch email statistics
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<{
    success: boolean;
    timeframe: string;
    stats: EmailStats;
  }>({
    queryKey: ['email-stats', timeframe],
    queryFn: async () => {
      const response = await fetch(`/api/communications/email-stats?hours=${timeframe}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch email statistics');
      }
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch deduplication logs
  const { data: logs, isLoading: logsLoading } = useQuery<{
    success: boolean;
    logs: DeduplicationLog[];
    count: number;
    timeframe: string;
  }>({
    queryKey: ['email-dedup-logs', timeframe],
    queryFn: async () => {
      const response = await fetch(`/api/communications/email-deduplication-logs?hours=${timeframe}&limit=100`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch deduplication logs');
      }
      return response.json();
    },
    refetchInterval: 30000
  });

  // Cleanup mutation
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/communications/email-cleanup', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to run cleanup');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cleanup Completed",
        description: `Deleted ${data.result.deletedKeys} expired keys, ${data.result.deletedAttempts} attempts, ${data.result.deletedLogs} old logs`,
      });
      queryClient.invalidateQueries({ queryKey: ['email-stats'] });
      queryClient.invalidateQueries({ queryKey: ['email-dedup-logs'] });
    },
    onError: (error) => {
      toast({
        title: "Cleanup Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getEmailTypeStyle = (type: string) => {
    return EMAIL_TYPES[type as keyof typeof EMAIL_TYPES]?.color || 'bg-gray-100 text-gray-800';
  };

  const getEmailTypeLabel = (type: string) => {
    return EMAIL_TYPES[type as keyof typeof EMAIL_TYPES]?.label || type;
  };

  return (
    <Layout title="Email Monitoring">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Monitoring</h1>
            <p className="text-gray-600 mt-1">Monitor email delivery and deduplication system</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Hour</SelectItem>
                <SelectItem value="6">6 Hours</SelectItem>
                <SelectItem value="24">24 Hours</SelectItem>
                <SelectItem value="168">7 Days</SelectItem>
                <SelectItem value="720">30 Days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={() => cleanupMutation.mutate()}
              disabled={cleanupMutation.isPending}
              variant="outline"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {cleanupMutation.isPending ? 'Cleaning...' : 'Run Cleanup'}
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? '...' : stats?.stats.totalSent ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statsLoading ? '...' : stats?.stats.totalFailed ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duplicates Prevented</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statsLoading ? '...' : stats?.stats.duplicatesPrevented ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retry Attempts</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statsLoading ? '...' : stats?.stats.retryAttempts ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Recipients</CardTitle>
              <Mail className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {statsLoading ? '...' : stats?.stats.uniqueRecipients ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Information */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deduplication-logs">Deduplication Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email System Health</CardTitle>
                <CardDescription>
                  Current status over the last {timeframe} hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-lg font-bold text-green-600">
                      {stats ? 
                        Math.round((stats.stats.totalSent / (stats.stats.totalSent + stats.stats.totalFailed)) * 100) || 0
                        : 0}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Duplicate Prevention Rate</span>
                    <span className="text-lg font-bold text-blue-600">
                      {stats ? 
                        Math.round((stats.stats.duplicatesPrevented / (stats.stats.duplicatesPrevented + stats.stats.totalSent)) * 100) || 0
                        : 0}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Average Retries per Email</span>
                    <span className="text-lg font-bold text-orange-600">
                      {stats ? 
                        (stats.stats.retryAttempts / Math.max(stats.stats.totalSent + stats.stats.totalFailed, 1)).toFixed(2)
                        : '0.00'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deduplication-logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Duplicate Prevention Events</CardTitle>
                <CardDescription>
                  Emails prevented from being sent due to deduplication rules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {logsLoading ? (
                    <div className="text-center py-4">Loading logs...</div>
                  ) : logs?.logs.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No duplicate prevention events in the last {timeframe} hours
                    </div>
                  ) : (
                    logs?.logs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{log.recipientEmail}</div>
                            <div className="flex items-center gap-2">
                              <Badge className={getEmailTypeStyle(log.emailType)}>
                                {getEmailTypeLabel(log.emailType)}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatDate(log.preventedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {log.metadata && (
                          <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                            <strong>Reason:</strong> {log.metadata.reason || 'Not specified'}<br />
                            {log.metadata.windowMinutes && (
                              <>
                                <strong>Window:</strong> {log.metadata.windowMinutes} minutes<br />
                              </>
                            )}
                            {log.metadata.originalSentAt && (
                              <>
                                <strong>Original sent:</strong> {formatDate(log.metadata.originalSentAt)}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
} 
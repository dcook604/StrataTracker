import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/layout';
import { 
  Calendar, 
  Download, 
  Filter, 
  Search, 
  RefreshCw, 
  User, 
  Activity, 
  Clock,
  Shield,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface AuditLog {
  id: number;
  timestamp: string;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: any;
  ipAddress: string | null;
}

interface AuditLogStats {
  actionStats: Array<{ action: string; count: number }>;
  userStats: Array<{ userId: number | null; userName: string | null; userEmail: string | null; count: number }>;
  dailyActivity: Array<{ date: string; count: number }>;
}

interface AuditLogResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function AuditLogPage() {
  const { toast } = useToast();
  
  // Filter states
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedAction, setSelectedAction] = useState<string>('__all__');
  const [selectedTargetType, setSelectedTargetType] = useState<string>('__all__');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    startDate,
    endDate,
    action: '',
    targetType: '',
    userId: '',
    search: '',
  });

  // Fetch audit logs
  const { data: auditData, isLoading, refetch } = useQuery<AuditLogResponse>({
    queryKey: ['/api/audit-logs', page, limit, appliedFilters],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(appliedFilters.startDate && { startDate: appliedFilters.startDate }),
        ...(appliedFilters.endDate && { endDate: appliedFilters.endDate }),
        ...(appliedFilters.action && { action: appliedFilters.action }),
        ...(appliedFilters.targetType && { targetType: appliedFilters.targetType }),
        ...(appliedFilters.userId && { userId: appliedFilters.userId }),
        ...(appliedFilters.search && { search: appliedFilters.search }),
      });
      return apiRequest('GET', `/api/audit-logs?${params}`).then((res: Response) => res.json());
    },
  });

  // Fetch audit statistics
  const { data: statsData } = useQuery<AuditLogStats>({
    queryKey: ['/api/audit-logs/stats', appliedFilters.startDate, appliedFilters.endDate],
    queryFn: () => {
      const params = new URLSearchParams({
        ...(appliedFilters.startDate && { startDate: appliedFilters.startDate }),
        ...(appliedFilters.endDate && { endDate: appliedFilters.endDate }),
      });
      return apiRequest('GET', `/api/audit-logs/stats?${params}`).then((res: Response) => res.json());
    },
  });

  // Fetch available actions and target types
  const { data: actionsData } = useQuery<{ actions: string[]; targetTypes: string[] }>({
    queryKey: ['/api/audit-logs/actions'],
    queryFn: () => apiRequest('GET', '/api/audit-logs/actions').then((res: Response) => res.json()),
  });

  const applyFilters = () => {
    setAppliedFilters({
      startDate,
      endDate,
      action: selectedAction === '__all__' ? '' : selectedAction,
      targetType: selectedTargetType === '__all__' ? '' : selectedTargetType,
      userId: selectedUserId,
      search,
    });
    setPage(1);
  };

  const resetFilters = () => {
    const defaultStartDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const defaultEndDate = format(new Date(), 'yyyy-MM-dd');
    
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setSelectedAction('__all__');
    setSelectedTargetType('__all__');
    setSelectedUserId('');
    setSearch('');
    setAppliedFilters({
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      action: '',
      targetType: '',
      userId: '',
      search: '',
    });
    setPage(1);
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams({
        ...(appliedFilters.startDate && { startDate: appliedFilters.startDate }),
        ...(appliedFilters.endDate && { endDate: appliedFilters.endDate }),
        ...(appliedFilters.action && { action: appliedFilters.action }),
        ...(appliedFilters.targetType && { targetType: appliedFilters.targetType }),
        ...(appliedFilters.userId && { userId: appliedFilters.userId }),
        ...(appliedFilters.search && { search: appliedFilters.search }),
      });

      const response = await apiRequest('GET', `/api/audit-logs/export?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: 'Export Successful',
          description: 'Audit logs have been exported to CSV.',
        });
      }
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export audit logs. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return <User className="h-4 w-4" />;
    if (action.includes('CREATED')) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (action.includes('UPDATED')) return <Info className="h-4 w-4 text-blue-600" />;
    if (action.includes('DELETED')) return <XCircle className="h-4 w-4 text-red-600" />;
    if (action.includes('FAILED') || action.includes('DENIED')) return <AlertCircle className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4" />;
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'secondary';
    if (action.includes('CREATED')) return 'default';
    if (action.includes('UPDATED')) return 'outline';
    if (action.includes('DELETED')) return 'destructive';
    if (action.includes('FAILED') || action.includes('DENIED')) return 'destructive';
    return 'secondary';
  };

  const formatDetails = (details: any) => {
    if (!details) return 'N/A';
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(details);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">
            Monitor and analyze system activity and user actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportLogs} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.actionStats.reduce((sum, stat) => sum + stat.count, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                In selected date range
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.userStats.filter(user => user.userId !== null).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Unique users with activity
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Active Action</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.actionStats[0]?.action.replace(/_/g, ' ') || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {statsData.actionStats[0]?.count || 0} occurrences
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter audit logs by date range, user, action type, and more
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All actions</SelectItem>
                  {actionsData?.actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="targetType">Target Type</Label>
              <Select value={selectedTargetType} onValueChange={setSelectedTargetType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All types</SelectItem>
                  {actionsData?.targetTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by user, email, action, or target ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={applyFilters}>Apply Filters</Button>
              <Button variant="outline" onClick={resetFilters}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Logs
          </CardTitle>
          <CardDescription>
            {auditData && `${auditData.pagination.totalCount} total events`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <ScrollArea className="h-[600px] w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead className="w-[200px]">User</TableHead>
                      <TableHead className="w-[200px]">Action</TableHead>
                      <TableHead className="w-[120px]">Target Type</TableHead>
                      <TableHead className="w-[120px]">Target ID</TableHead>
                      <TableHead className="w-[120px]">IP Address</TableHead>
                      <TableHead className="w-[200px]">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditData?.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{log.userName || 'SYSTEM'}</div>
                            <div className="text-sm text-muted-foreground">{log.userEmail || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.action)} className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            {log.action.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {log.targetType?.replace(/_/g, ' ') || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.targetId || 'N/A'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.ipAddress || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <details className="max-w-[200px]">
                            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                              View details
                            </summary>
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                              {formatDetails(log.details)}
                            </pre>
                          </details>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              {/* Pagination */}
              {auditData && auditData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((auditData.pagination.page - 1) * auditData.pagination.limit) + 1} to{' '}
                    {Math.min(auditData.pagination.page * auditData.pagination.limit, auditData.pagination.totalCount)} of{' '}
                    {auditData.pagination.totalCount} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={!auditData.pagination.hasPrev}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {auditData.pagination.page} of {auditData.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!auditData.pagination.hasNext}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bell, 
  BarChart,
  DownloadCloud, 
  FileSpreadsheet,
  File,
  Mail
} from "lucide-react";
import {
  PieChart,
  Pie,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from "recharts";
import { EmptyState } from "@/components/empty-state";

// For the type chart
type ViolationType = {
  type: string;
  count: number;
};

// For the monthly chart
type MonthlyViolation = {
  month: number;
  count: number;
};

// For the repeat violations table
type RepeatViolation = {
  unitId: number;
  unitNumber: string;
  count: number;
  lastViolationDate: string;
};

export default function ReportsPage() {
  const { user } = useAuth();
  const [timeFrame, setTimeFrame] = useState<'month' | 'quarter' | 'year' | 'custom'>('year');
  const currentYear = new Date().getFullYear();
  
  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/reports/stats'],
  });
  
  // Fetch violations by type
  const { data: violationsByType, isLoading: typesLoading } = useQuery<ViolationType[]>({
    queryKey: ['/api/reports/violations-by-type'],
  });
  
  // Fetch violations by month
  const { data: violationsByMonth, isLoading: monthsLoading } = useQuery<MonthlyViolation[]>({
    queryKey: ['/api/reports/violations-by-month', { year: currentYear }],
  });
  
  // Fetch repeat violations
  const { data: repeatViolations, isLoading: repeatLoading } = useQuery<RepeatViolation[]>({
    queryKey: ['/api/reports/repeat-violations', { minCount: 3 }],
  });
  
  // Prepare chart data
  const typeChartData = violationsByType?.map(item => ({
    ...item,
    type: getViolationTypeName(item.type),
  })) || [];
  
  // Add month names to monthly data
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyChartData = violationsByMonth?.map(item => ({
    ...item,
    name: monthNames[item.month - 1],
  })) || [];
  
  // Colors for the pie chart
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];
  
  function getViolationTypeName(type: string) {
    const typeMap: Record<string, string> = {
      noise: "Noise Complaint",
      parking: "Parking Violation",
      garbage: "Improper Garbage Disposal",
      pet: "Unauthorized Pet",
      property: "Property Damage",
      balcony: "Balcony Misuse",
      other: "Other",
    };
    return typeMap[type] || type;
  }
  
  // Column definition for repeat violations table
  const columns: ColumnDef<RepeatViolation>[] = [
    {
      accessorKey: "unitNumber",
      header: "Unit",
      cell: ({ row }) => <div className="font-medium">#{row.original.unitNumber}</div>,
    },
    {
      accessorKey: "count",
      header: "Total Violations",
      cell: ({ row }) => row.original.count,
    },
    {
      accessorKey: "lastViolationDate",
      header: "Most Recent",
      cell: ({ row }) => format(new Date(row.original.lastViolationDate), "MMM dd, yyyy"),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Link href={`/violations?unitId=${row.original.unitId}`}>
          <Button variant="link" size="sm" className="text-primary-600 hover:text-primary-900">
            View Violations
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200 md:py-4 md:px-6">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-neutral-800">Reports & Analytics</h2>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-neutral-600 hover:text-primary-600">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="flex items-center">
              <UserAvatar user={user} className="h-8 w-8" />
              <span className="ml-2 text-sm font-medium text-neutral-700 hidden md:inline-block">
                {user?.fullName}
              </span>
            </div>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-50">
          <div className="max-w-6xl mx-auto">
            {/* Date Range Selector */}
            <Card className="shadow p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="font-medium text-neutral-700 mb-3 sm:mb-0">Select time period:</div>
                <div className="flex space-x-2">
                  <Button 
                    variant={timeFrame === 'month' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTimeFrame('month')}
                  >
                    Month
                  </Button>
                  <Button 
                    variant={timeFrame === 'quarter' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTimeFrame('quarter')}
                  >
                    Quarter
                  </Button>
                  <Button 
                    variant={timeFrame === 'year' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTimeFrame('year')}
                  >
                    Year
                  </Button>
                  <Button 
                    variant={timeFrame === 'custom' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTimeFrame('custom')}
                  >
                    Custom
                  </Button>
                </div>
              </div>
            </Card>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card className="overflow-hidden shadow">
                <CardContent className="p-5">
                  {statsLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                        <BarChart className="h-6 w-6 text-primary-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-neutral-500 truncate">Total Reports ({currentYear})</dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-neutral-900">{stats?.totalViolations || 0}</div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden shadow">
                <CardContent className="p-5">
                  {statsLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                        <BarChart className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-neutral-500 truncate">Approved</dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-neutral-900">{stats?.approvedViolations || 0}</div>
                            {stats && stats.totalViolations > 0 && (
                              <span className="ml-2 text-sm font-medium text-green-600">
                                {Math.round((stats.approvedViolations / stats.totalViolations) * 100)}%
                              </span>
                            )}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden shadow">
                <CardContent className="p-5">
                  {statsLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                        <BarChart className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-neutral-500 truncate">Disputed</dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-neutral-900">{stats?.disputedViolations || 0}</div>
                            {stats && stats.totalViolations > 0 && (
                              <span className="ml-2 text-sm font-medium text-yellow-600">
                                {Math.round((stats.disputedViolations / stats.totalViolations) * 100)}%
                              </span>
                            )}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden shadow">
                <CardContent className="p-5">
                  {statsLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                        <BarChart className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-neutral-500 truncate">Rejected</dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-neutral-900">{stats?.rejectedViolations || 0}</div>
                            {stats && stats.totalViolations > 0 && (
                              <span className="ml-2 text-sm font-medium text-red-600">
                                {Math.round((stats.rejectedViolations / stats.totalViolations) * 100)}%
                              </span>
                            )}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Charts & Detailed Reports */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
              {/* Violation Types Chart */}
              <Card className="shadow p-6">
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Violation Types</h3>
                {typesLoading ? (
                  <Skeleton className="h-64 w-full rounded-lg" />
                ) : (
                  typeChartData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={typeChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {typeChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-neutral-50 rounded-lg">
                      <p className="text-neutral-500">No violation type data available</p>
                    </div>
                  )
                )}
                {typeChartData.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {typeChartData.slice(0, 4).map((item, index) => (
                      <div key={index} className="flex items-center">
                        <span 
                          className="h-3 w-3 rounded-full mr-2" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-neutral-600">
                          {item.type} ({Math.round((item.count / typeChartData.reduce((sum, item) => sum + item.count, 0)) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              
              {/* Monthly Trends Chart */}
              <Card className="shadow p-6">
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Monthly Trends</h3>
                {monthsLoading ? (
                  <Skeleton className="h-64 w-full rounded-lg" />
                ) : (
                  monthlyChartData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#3b82f6" 
                            name="Violations" 
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-neutral-50 rounded-lg">
                      <p className="text-neutral-500">No monthly trend data available</p>
                    </div>
                  )
                )}
              </Card>
            </div>
            
            {/* Repeat Violations Report */}
            <Card className="shadow p-6 mb-6">
              <h3 className="text-lg font-medium text-neutral-900 mb-4">Repeat Violations (Units with 3+ violations)</h3>
              {repeatLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                repeatViolations && repeatViolations.length > 0 ? (
                  <DataTable 
                    columns={columns} 
                    data={repeatViolations} 
                  />
                ) : (
                  <EmptyState
                    title="No repeat violations"
                    description="There are no units with 3 or more violations"
                    icon={<BarChart className="h-8 w-8 text-neutral-400" />}
                  />
                )
              )}
            </Card>
            
            {/* Export Options */}
            <Card className="shadow p-6">
              <h3 className="text-lg font-medium text-neutral-900 mb-4">Export Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  className="flex items-center justify-center" 
                  variant="outline"
                >
                  <File className="mr-2 h-5 w-5 text-neutral-500" />
                  Export to PDF
                </Button>
                <Button 
                  className="flex items-center justify-center" 
                  variant="outline"
                >
                  <FileSpreadsheet className="mr-2 h-5 w-5 text-neutral-500" />
                  Export to Excel
                </Button>
                <Button 
                  className="flex items-center justify-center" 
                  variant="outline"
                >
                  <Mail className="mr-2 h-5 w-5 text-neutral-500" />
                  Email Report
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

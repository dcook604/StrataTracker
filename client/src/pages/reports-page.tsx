import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Eye,
  Loader2
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
  Cell
} from "recharts";
import { EmptyState } from "@/components/empty-state";
import { Layout } from "@/components/layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { ViolationCategory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Custom DateRangePicker component
const DateRangePicker = ({ from, to, onFromChange, onToChange }: {
  from: Date;
  to: Date;
  onFromChange: (date: Date | undefined) => void;
  onToChange: (date: Date | undefined) => void;
}) => {
  return (
    <div className="flex gap-2">
      <input
        type="date"
        value={format(from, "yyyy-MM-dd")}
        onChange={(e) => onFromChange(new Date(e.target.value))}
        className="border rounded p-2"
      />
      <input
        type="date"
        value={format(to, "yyyy-MM-dd")}
        onChange={(e) => onToChange(new Date(e.target.value))}
        className="border rounded p-2"
      />
    </div>
  );
};

// For the repeat violations table
type RepeatViolation = {
  unitId: number;
  unitNumber: string;
  count: number;
  lastViolationDate: string;
};

// Define types for the combined API response
interface ReportStatsData {
  totalViolations: number;
  newViolations: number;
  pendingViolations: number;
  approvedViolations: number;
  disputedViolations: number;
  rejectedViolations: number;
  resolvedViolations: number;
  averageResolutionTimeDays: number | null;
}

interface MonthlyViolationData {
  month: string; // e.g., "2023-01"
  count: number;
}

interface ViolationTypeData {
  type: string;
  count: number;
}

interface CombinedReportData {
  stats: ReportStatsData;
  violationsByMonth: MonthlyViolationData[];
  violationsByType: ViolationTypeData[];
}

// --- Monthly Fines Report Types ---
type MonthlyFines = { month: string; totalFines: number }[];

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  // Default to the last 30 days
  const today = new Date();
  const priorDate = new Date(new Date().setDate(today.getDate() - 30));
  priorDate.setHours(0,0,0,0);
  today.setHours(23,59,59,999);

  const [dateRange, setDateRange] = useState({ from: priorDate, to: today });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all"); // Store ID
  const [selectedMonth, setSelectedMonth] = useState<string>(() => format(dateRange.to, 'yyyy-MM'));

  // Fetch violation categories for the dropdown
  const { data: categories, isLoading: categoriesLoading } = useQuery<ViolationCategory[]>({
    queryKey: ['violationCategories', 'active'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/violation-categories?active=true");
      if (!res.ok) throw new Error('Failed to fetch violation categories');
      return res.json();
    },
  });

  // Combined query for all report data
  const { 
    data: reportData,
    isLoading: reportDataLoading,
    error: reportDataError,
    refetch: refetchReportData // Added refetch
  } = useQuery<CombinedReportData>({
    queryKey: ['reports', 'allData', dateRange, selectedCategoryId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('from', dateRange.from.toISOString());
      params.append('to', dateRange.to.toISOString());
      if (selectedCategoryId !== "all") {
        params.append('categoryId', selectedCategoryId);
      }
      const res = await apiRequest("GET", `/api/reports/stats?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to fetch report data' }));
        throw new Error(errorData.message || 'Failed to fetch report data');
      }
      return res.json();
    },
    enabled: !!user, // Only run if user is loaded
  });

  // Fetch repeat violations (can remain separate if its params are different or it's a heavy query)
  const { data: repeatViolations, isLoading: repeatLoading, error: repeatError } = useQuery<RepeatViolation[]>({
    queryKey: ['reports', 'violations', 'repeat', { minCount: 3 }], // This query is fine as is for now
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reports/repeat-violations?minCount=3`);
      if (!res.ok) throw new Error('Failed to fetch repeat violations');
      return res.json();
    },
  });
  
  // Prepare chart data using reportData
  const typeChartData = reportData?.violationsByType?.map(item => ({
    name: item.type, // Already a string from backend
    value: item.count,
  })) || [];
  
  const monthlyChartData = reportData?.violationsByMonth?.map(item => ({
    name: format(new Date(item.month + '-02'), "MMM yyyy"), // Ensure date is parsed correctly for month name
    count: item.count,
  })) || [];
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4500'];
  
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
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-blue-600 hover:text-blue-900 hover:bg-blue-50"
            title="View violations for this unit"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
    },
  ];

  const handleFromChange = (date: Date | undefined) => {
    if (date) {
      // Ensure 'from' date starts at the beginning of the day
      date.setHours(0,0,0,0);
      setDateRange(prev => ({ ...prev, from: date as Date }));
    }
  };

  const handleToChange = (date: Date | undefined) => {
    if (date) {
      // Ensure 'to' date includes the whole day
      date.setHours(23,59,59,999);
      setDateRange(prev => ({ ...prev, to: date as Date }));
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };

  // Effect to refetch data when dateRange or selectedCategory changes
  useEffect(() => {
    refetchReportData();
  }, [dateRange, selectedCategoryId, refetchReportData]);

  const isLoading = reportDataLoading || categoriesLoading; // Overall loading state

  // Fetch monthly fines data
  const { data: monthlyFinesData, isLoading: monthlyFinesLoading, error: monthlyFinesError } = useQuery<MonthlyFines>({
    queryKey: ['reports', 'monthlyFines', selectedMonth, selectedCategoryId],
    queryFn: async () => {
      const params = new URLSearchParams();
      // Always fetch a full year for chart, but filter for selected month for total
      const year = selectedMonth.split('-')[0];
      params.append('from', `${year}-01-01T00:00:00.000Z`);
      params.append('to', `${year}-12-31T23:59:59.999Z`);
      if (selectedCategoryId !== "all") params.append('categoryId', selectedCategoryId);
      const res = await apiRequest("GET", `/api/reports/monthly-fines?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch monthly fines');
      return res.json();
    },
    enabled: !!user && !!selectedMonth,
  });

  // Handler for month picker
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };

  // Find the total for the selected month
  const selectedMonthTotal = monthlyFinesData?.find(m => m.month === selectedMonth)?.totalFines ?? 0;

  const renderFinesByBylawChart = (data: any[]) => {
    const chartData = Object.entries(
      data.reduce((acc, fine) => {
        if (!acc[fine.bylaw]) acc[fine.bylaw] = 0;
        acc[fine.bylaw] += fine.totalFines;
        return acc;
      }, {})
    ).map(([bylaw, totalFines]) => ({ bylaw, totalFines }));

    return (
      <ResponsiveContainer width="100%" height={350}>
        <RechartsBarChart data={chartData}>
          <XAxis dataKey="bylaw" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="totalFines" fill="#82ca9d" name="Total Fines" />
        </RechartsBarChart>
      </ResponsiveContainer>
    );
  };
  
  const renderViolationsByUnitChart = (data: any[]) => {
    const chartData = Object.entries(
      data.reduce((acc, v) => {
        if (!acc[v.unitNumber]) acc[v.unitNumber] = 0;
        acc[v.unitNumber] += v.violationCount;
        return acc;
      }, {})
    ).map(([unit, violationCount]) => ({ unit, violationCount }));

    return (
      <ResponsiveContainer width="100%" height={350}>
        <RechartsBarChart data={chartData}>
          <XAxis dataKey="unit" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="violationCount" fill="#8884d8" name="Violations" />
        </RechartsBarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Layout title="Reports & Analytics">
      <div className="space-y-6 px-4 md:px-6">
        <div className="flex flex-col gap-4">
          {/* Report filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-card p-4 rounded-lg">
            <div className="w-full md:w-auto">
              <DateRangePicker
                from={dateRange.from}
                to={dateRange.to}
                onFromChange={handleFromChange}
                onToChange={handleToChange}
              />
            </div>
            <div className="w-full md:w-[200px]">
              <Select
                value={selectedCategoryId}
                onValueChange={handleCategoryChange} // Updated handler
                disabled={categoriesLoading}
              >
                <SelectTrigger className="h-12 md:h-10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id.toString()} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"> {/* Adjusted to 4 columns for new stats */}
            {reportDataError ? (
              <Card className="col-span-full">
                <CardContent className="p-6">
                  <div className="text-destructive">Error loading stats: {reportDataError.message}</div>
                </CardContent>
              </Card>
            ) : isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-8 w-1/2" />
                </Card>
              ))
            ) : reportData?.stats ? (
              <>
                <Card className="p-6">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Violations</h3>
                    <div className="text-2xl md:text-3xl font-bold mt-2">{reportData.stats.totalViolations}</div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-medium text-muted-foreground">Resolved Violations</h3>
                    <div className="text-2xl md:text-3xl font-bold mt-2">{reportData.stats.resolvedViolations}</div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-medium text-muted-foreground">Resolution Rate</h3>
                    <div className="text-2xl md:text-3xl font-bold mt-2">
                      {reportData.stats.totalViolations > 0 
                        ? ((reportData.stats.resolvedViolations / reportData.stats.totalViolations) * 100).toFixed(1) 
                        : 0}%
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-medium text-muted-foreground">Avg. Resolution Time</h3>
                    <div className="text-2xl md:text-3xl font-bold mt-2">
                      {reportData.stats.averageResolutionTimeDays !== null ? reportData.stats.averageResolutionTimeDays : 'N/A'} days
                    </div>
                  </div>
                </Card>
              </>
            ) : null}
            </div>
            
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">Violations by Type</h3>
              </div>
              <div className="p-6">
                {isLoading ? (
                  <div className="h-[300px] md:h-[400px] flex justify-center items-center">
                    <span className="animate-spin">⏳</span> Loading...
                  </div>
                ) : reportDataError ? (
                  <div className="text-destructive">Error loading violation types: {reportDataError.message}</div>
                ) : typeChartData.length > 0 ? (
                  <div className="h-[300px] md:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius="80%"
                          labelLine={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                {`${(percent * 100).toFixed(0)}%`}
                              </text>
                            );
                          }}
                        >
                          {typeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [value, name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : <EmptyState title="No data available" description="No violations found for the selected filters." />}
              </div>
            </Card>
            <Card className="overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">Violations Over Time (Monthly)</h3>
              </div>
              <div className="p-6">
                {isLoading ? (
                  <div className="h-[300px] md:h-[400px] flex justify-center items-center">
                    <span className="animate-spin">⏳</span> Loading...
                  </div>
                ) : reportDataError ? (
                  <div className="text-destructive">Error loading monthly data: {reportDataError.message}</div>
                ) : monthlyChartData.length > 0 ? (
                  <div className="h-[300px] md:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={monthlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip formatter={(value: number, name: string) => [value, `Violations`]} />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" name="Violations" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <EmptyState title="No data available" description="No violations found for the selected filters." />}
              </div>
            </Card>
          </div>

          {/* Repeat Violations Table - can remain as is or also be filtered if desired */}
          <Card>
            <CardHeader>
              <CardTitle>Repeat Violations (Units with 3+)</CardTitle>
            </CardHeader>
            <CardContent>
              {repeatError ? (
                <div className="text-destructive">Error loading repeat violations: {repeatError.message}</div>
              ) : repeatLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : repeatViolations && repeatViolations.length > 0 ? (
                <DataTable columns={columns} data={repeatViolations} />
              ) : (
                <EmptyState title="No repeat violations" description="No units currently have 3 or more violations." />
              )}
            </CardContent>
          </Card>

          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Violations Monthly Fines</CardTitle>
                <div className="flex flex-col md:flex-row md:items-center gap-4 mt-2">
                  <label className="font-medium">Select Month:</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="border rounded p-2 w-[160px]"
                  />
                  <span className="ml-4 text-lg font-semibold">Total Fines: <span className="text-blue-700">${selectedMonthTotal.toFixed(2)}</span></span>
                </div>
              </CardHeader>
              <CardContent>
                {monthlyFinesLoading ? (
                  <div className="h-48 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /> Loading fines...</div>
                ) : monthlyFinesError ? (
                  <div className="text-destructive">Error loading monthly fines: {monthlyFinesError.message}</div>
                ) : (
                  <div className="h-[300px] md:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={monthlyFinesData || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tickFormatter={m => format(new Date(m + '-02'), 'MMM yyyy')} />
                        <YAxis tickFormatter={v => `$${v}`} />
                        <Tooltip formatter={v => `$${v}`} labelFormatter={m => format(new Date(m + '-02'), 'MMM yyyy')} />
                        <Bar dataKey="totalFines" fill="#2563eb" name="Total Fines" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </Layout>
  );
}

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Mail,
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
  LineChart,
  Line,
  Cell
} from "recharts";
import { EmptyState } from "@/components/empty-state";
import { Layout } from "@/components/layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ViolationCategory } from "@shared/schema";

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

export default function ReportsPage() {
  const { user } = useAuth();
  // Default to the last 30 days
  const today = new Date();
  const priorDate = new Date(new Date().setDate(today.getDate() - 30));
  priorDate.setHours(0,0,0,0);
  today.setHours(23,59,59,999);

  const [dateRange, setDateRange] = useState({ from: priorDate, to: today });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all"); // Store ID
  const [isExporting, setIsExporting] = useState<boolean>(false); // New state for export loading

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
          <Button variant="link" size="sm" className="text-primary-600 hover:text-primary-900">
            View Violations
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

  const handleGenerateReport = async (reportType: 'csv' | 'pdf') => {
    setIsExporting(true);
    const params = new URLSearchParams();
    params.append('from', dateRange.from.toISOString());
    params.append('to', dateRange.to.toISOString());
    if (selectedCategoryId !== "all") {
      params.append('categoryId', selectedCategoryId);
    }

    const endpoint = reportType === 'csv' ? `/api/reports/export/csv` : `/api/reports/export/pdf`;
    const filename = reportType === 'csv' ? "violations_report.csv" : "violations_report.pdf";
    
    try {
      const response = await apiRequest("GET", `${endpoint}?${params.toString()}`);

      if (!response.ok) {
        // Try to parse error message from backend if it's JSON
        let errorDetail = `Failed to generate ${reportType} report. Status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.message || errorData.details || errorDetail;
        } catch (e) {
          // Ignore if error response is not JSON
        }
        throw new Error(errorDetail);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error: any) {
      console.error(`Error generating ${reportType} report:`, error);
      // TODO: Add toast notification for error, e.g., using useToast()
      // Example: toast({ variant: "destructive", title: "Export Error", description: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = reportDataLoading || categoriesLoading; // Overall loading state

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
                disabled={categoriesLoading || isExporting}
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
            {/* Export Dropdown */}
            <div className="w-full md:w-auto">
              <Select onValueChange={(value: 'csv' | 'pdf') => handleGenerateReport(value)} disabled={isExporting}>
                <SelectTrigger className="h-12 md:h-10 w-full md:w-[180px]">
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <DownloadCloud className="mr-2 h-4 w-4" />
                  )}
                  <SelectValue placeholder="Export Report" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export to CSV
                  </SelectItem>
                  <SelectItem value="pdf">
                    <File className="mr-2 h-4 w-4" />
                    Export to PDF
                  </SelectItem>
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

        </div>
      </div>
    </Layout>
  );
}

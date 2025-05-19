import { useState } from "react";
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
import { Layout } from "@/components/layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

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

export default function ReportsPage() {
  const { user } = useAuth();
  const [timeFrame, setTimeFrame] = useState<'month' | 'quarter' | 'year' | 'custom'>('year');
  const currentYear = new Date().getFullYear();
  const [dateRange, setDateRange] = useState({ from: new Date(), to: new Date() });
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories] = useState([
    { id: "1", name: "Noise" },
    { id: "2", name: "Maintenance" },
    { id: "3", name: "Parking" },
  ]);
  
  // Fetch stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['reports', 'stats'],
    queryFn: async () => {
      const res = await apiRequest("GET", '/api/reports/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });
  
  // Fetch violations by type
  const { data: violationsByType, isLoading: typesLoading, error: typesError } = useQuery<ViolationType[]>({
    queryKey: ['reports', 'violations', 'by-type'],
    queryFn: async () => {
      const res = await apiRequest("GET", '/api/reports/violations-by-type');
      if (!res.ok) throw new Error('Failed to fetch violation types');
      return res.json();
    },
  });
  
  // Fetch violations by month
  const { data: violationsByMonth, isLoading: monthsLoading, error: monthsError } = useQuery<MonthlyViolation[]>({
    queryKey: ['reports', 'violations', 'by-month', { year: currentYear }],
    queryFn: async () => {
      const res = await apiRequest("GET", '/api/reports/violations-by-month', { year: currentYear });
      if (!res.ok) throw new Error('Failed to fetch monthly violations');
      return res.json();
    },
  });
  
  // Fetch repeat violations
  const { data: repeatViolations, isLoading: repeatLoading, error: repeatError } = useQuery<RepeatViolation[]>({
    queryKey: ['reports', 'violations', 'repeat', { minCount: 3 }],
    queryFn: async () => {
      const res = await apiRequest("GET", '/api/reports/repeat-violations', { minCount: 3 });
      if (!res.ok) throw new Error('Failed to fetch repeat violations');
      return res.json();
    },
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
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  
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

  // Mock data - replace with actual data
  const totalViolations = 150;
  const resolutionRate = 85;
  const avgResponseTime = 2.5;
  
  const categoryData = [
    { name: "Noise", value: 30 },
    { name: "Maintenance", value: 45 },
    { name: "Parking", value: 25 },
  ];

  const timeData = [
    { date: "Jan", violations: 20 },
    { date: "Feb", violations: 35 },
    { date: "Mar", violations: 25 },
    { date: "Apr", violations: 40 },
  ];

  const handleFromChange = (date: Date | undefined) => {
    if (date) {
      setDateRange(prev => ({ ...prev, from: date }));
    }
  };

  const handleToChange = (date: Date | undefined) => {
    if (date) {
      setDateRange(prev => ({ ...prev, to: date }));
    }
  };

  const handleGenerateReport = () => {
    // Implement report generation logic
    console.log("Generating report with:", { dateRange, selectedCategory });
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
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="h-12 md:h-10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
            <Button 
              onClick={handleGenerateReport}
              className="w-full md:w-auto h-12 md:h-10"
            >
              <DownloadCloud className="h-5 w-5 mr-2" />
              Generate Report
            </Button>
          </div>
        
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statsError ? (
              <Card className="col-span-full">
                <CardContent className="p-6">
                  <div className="text-destructive">Error loading stats: {statsError.message}</div>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="p-6">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Violations</h3>
                    <div className="text-2xl md:text-3xl font-bold mt-2">{stats?.totalViolations || 0}</div>
                      </div>
                </Card>
                <Card className="p-6">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-medium text-muted-foreground">Resolution Rate</h3>
                    <div className="text-2xl md:text-3xl font-bold mt-2">{stats?.resolutionRate || 0}%</div>
                    </div>
              </Card>
                <Card className="p-6">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-medium text-muted-foreground">Average Response Time</h3>
                    <div className="text-2xl md:text-3xl font-bold mt-2">{stats?.avgResponseTime || 0} days</div>
                    </div>
              </Card>
              </>
            )}
            </div>
            
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">Violations by Category</h3>
              </div>
              <div className="p-6">
                {typesError ? (
                  <div className="text-destructive">Error loading violation types: {typesError.message}</div>
                ) : (
                  <div className="h-[300px] md:h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                            cx="50%"
                            cy="50%"
                          outerRadius="80%"
                            fill="#8884d8"
                          label
                          >
                          {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                  </div>
                )}
              </div>
              </Card>
            <Card className="overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">Violations Over Time</h3>
              </div>
              <div className="p-6">
                {monthsError ? (
                  <div className="text-destructive">Error loading monthly data: {monthsError.message}</div>
                ) : (
                  <div className="h-[300px] md:h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeData}>
                        <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                        <Legend />
                          <Line 
                            type="monotone" 
                          dataKey="violations" 
                          stroke="#8884d8"
                            strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

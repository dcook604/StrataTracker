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
    <>
      {/* Page Title */}
      <div className="flex items-center">
        <h2 className="text-lg font-semibold text-neutral-800">Reports & Analytics</h2>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-neutral-50">
        {/* Add your reports content here */}
      </main>
    </>
  );
}

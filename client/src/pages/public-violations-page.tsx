import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { PublicSidebar } from "@/components/public-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Eye, AlertCircle, Calendar, FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { supabase } from "@/lib/supabase";
import { apiRequest } from "@/lib/queryClient";

interface Violation {
  id: number;
  uuid: string;
  violationType: string;
  description: string;
  status: string;
  createdAt: string;
  violationDate: string;
  fineAmount: number | null;
  category?: {
    name: string;
  };
}

export default function PublicViolationsPage() {
  const [, navigate] = useLocation();
  const { session, user, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The AuthProvider now handles auth state, so we just need to wait for it.
  useEffect(() => {
    if (!authIsLoading && !user) {
      navigate('/auth'); // Redirect to main login page if not authenticated
      return;
    }
  }, [authIsLoading, user, navigate]);

  // Fetch violations for the user's unit
  useEffect(() => {
    if (user) {
      loadViolations();
    }
  }, [user]);

  const loadViolations = async () => {
    try {
      setLoading(true);
      setError(null);
      // We need a new endpoint for public users to get their violations.
      // Let's assume there is a /api/public/violations endpoint
      const response = await apiRequest('GET', '/api/public/violations');
      const data = await response.json();
      setViolations(data.violations || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load violations');
      toast({
        title: "Error",
        description: "Failed to load violations for your unit.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (violationId: number) => {
    navigate(`/public/violations/${violationId}`);
  };

  const getViolationTypeName = (type: string) => {
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
  };

  const getDaysAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (authIsLoading || !user) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  return (
    <div className="h-screen flex">
      <PublicSidebar className="w-64 flex-shrink-0" />
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Unit Violations</h1>
                <p className="text-gray-600 mt-1">
                  All violations for your unit.
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{violations.length}</div>
                <div className="text-sm text-gray-500">Total Violations</div>
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading violations...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Violations</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={loadViolations}>Try Again</Button>
            </div>
          ) : violations.length === 0 ? (
            <EmptyState
              title="No violations found"
              description="There are no violations recorded for your unit."
              icon={<FileText className="h-8 w-8 text-gray-400" />}
            />
          ) : (
            <div className="grid gap-4">
              {violations.map((violation) => (
                <Card key={violation.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant="outline" className="font-mono">
                          {`VIO-${format(new Date(violation.createdAt), 'yyyyMMdd')}-${violation.id.toString().padStart(3, '0')}`}
                        </Badge>
                        <StatusBadge status={violation.status as any} />
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {getDaysAgo(violation.violationDate)} days ago
                        </Badge>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {getViolationTypeName(violation.violationType)}
                      </h3>

                      {violation.description && (
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {violation.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Reported: {format(new Date(violation.createdAt), "MMM dd, yyyy")}</span>
                        </div>
                        {violation.category && (
                          <div className="flex items-center gap-1">
                            <span>Category: {violation.category.name}</span>
                          </div>
                        )}
                      </div>

                      {violation.fineAmount && violation.fineAmount > 0 && (
                        <div className="mt-2">
                          <Badge variant="destructive">
                            Fine: ${violation.fineAmount.toFixed(2)}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 lg:w-48">
                      <Button
                        variant="outline"
                        onClick={() => handleViewDetails(violation.id)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
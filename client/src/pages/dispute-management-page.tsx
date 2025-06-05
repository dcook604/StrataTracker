import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { ViolationDetail } from "@/components/violation-detail";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  AlertCircle, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  Eye,
  Calendar,
  Building
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DisputedViolation {
  id: number;
  uuid: string;
  referenceNumber: string;
  violationType: string;
  description: string;
  status: string;
  createdAt: string;
  violationDate: string;
  unit: {
    id: number;
    unitNumber: string;
    ownerName?: string;
    ownerEmail?: string;
    tenantName?: string;
    tenantEmail?: string;
  };
  category?: {
    id: number;
    name: string;
    defaultFineAmount?: number;
  };
  fineAmount?: number;
}

export default function DisputeManagementPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedViolation, setSelectedViolation] = useState<DisputedViolation | null>(null);
  const [showQuickActionDialog, setShowQuickActionDialog] = useState(false);
  const [quickActionType, setQuickActionType] = useState<'approve' | 'reject'>('approve');
  const [quickRejectReason, setQuickRejectReason] = useState("");
  const [quickFineAmount, setQuickFineAmount] = useState<number | "">("");

  // Fetch disputed violations
  const { data: disputedViolations, isLoading, error } = useQuery<DisputedViolation[]>({
    queryKey: ['/api/violations', { status: 'disputed' }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/violations?status=disputed");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Quick action mutation
  const quickActionMutation = useMutation({
    mutationFn: async ({ 
      violationId, 
      action, 
      rejectionReason, 
      fineAmount 
    }: { 
      violationId: string; 
      action: 'approve' | 'reject'; 
      rejectionReason?: string; 
      fineAmount?: number;
    }) => {
      if (action === 'approve' && fineAmount !== undefined) {
        // Set fine first, then approve
        await apiRequest("PATCH", `/api/violations/${violationId}/fine`, { amount: fineAmount });
      }
      
      const res = await apiRequest("PATCH", `/api/violations/${violationId}/status`, { 
        status: action === 'approve' ? 'approved' : 'rejected',
        rejectionReason: rejectionReason 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/violations', { status: 'disputed' }] });
      queryClient.invalidateQueries({ queryKey: ['/api/violations'] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stats"] });
      setShowQuickActionDialog(false);
      setSelectedViolation(null);
      setQuickRejectReason("");
      setQuickFineAmount("");
      toast({
        title: "Action completed",
        description: `Violation has been ${quickActionType === 'approve' ? 'approved' : 'rejected'} successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update violation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredViolations = disputedViolations?.filter(violation =>
    violation.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    violation.violationType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    violation.unit.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (violation.unit.ownerName && violation.unit.ownerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (violation.unit.tenantName && violation.unit.tenantName.toLowerCase().includes(searchTerm.toLowerCase()))
  ) ?? [];

  const handleQuickAction = (violation: DisputedViolation, action: 'approve' | 'reject') => {
    setSelectedViolation(violation);
    setQuickActionType(action);
    if (action === 'approve') {
      setQuickFineAmount(violation.category?.defaultFineAmount ?? "");
    }
    setShowQuickActionDialog(true);
  };

  const handleConfirmQuickAction = () => {
    if (!selectedViolation) return;
    
    if (quickActionType === 'reject' && !quickRejectReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting this violation",
        variant: "destructive",
      });
      return;
    }

    if (quickActionType === 'approve' && quickFineAmount === "") {
      toast({
        title: "Fine amount required",
        description: "Please provide a fine amount for approval",
        variant: "destructive",
      });
      return;
    }

    quickActionMutation.mutate({
      violationId: selectedViolation.uuid || selectedViolation.id.toString(),
      action: quickActionType,
      rejectionReason: quickActionType === 'reject' ? quickRejectReason : undefined,
      fineAmount: quickActionType === 'approve' ? Number(quickFineAmount) : undefined,
    });
  };

  const getDaysDisputed = (violationDate: string) => {
    const violation = new Date(violationDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - violation.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <Layout title="Dispute Management">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Dispute Management">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Disputes</h2>
          <p className="text-gray-600">There was an error loading the disputed violations.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dispute Management">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-orange-900 mb-2">Dispute Management</h1>
              <p className="text-orange-700">Review and resolve disputed violations</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-orange-900">{filteredViolations.length}</div>
              <div className="text-sm text-orange-600">Disputed Violations</div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by reference, type, unit, or resident name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-gray-600">
              {filteredViolations.length} of {disputedViolations?.length || 0} violations
            </div>
          </div>
        </Card>

        {/* Disputed Violations List */}
        {filteredViolations.length === 0 ? (
          <EmptyState
            title="No disputed violations"
            description={searchTerm ? "No violations match your search criteria." : "There are no disputed violations to review."}
            icon={<AlertCircle className="h-8 w-8 text-gray-400" />}
            actionLabel={searchTerm ? "Clear Search" : "View All Violations"}
            onAction={() => searchTerm ? setSearchTerm("") : navigate("/violations")}
          />
        ) : (
          <div className="grid gap-4">
            {filteredViolations.map((violation) => (
              <Card key={violation.id} className="p-6 border-l-4 border-l-orange-500">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="outline" className="font-mono">
                        {violation.referenceNumber}
                      </Badge>
                      <StatusBadge status={violation.status as any} />
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        {getDaysDisputed(violation.violationDate)} days disputed
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Unit {violation.unit.unitNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-gray-500" />
                        <span>{violation.violationType}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{new Date(violation.violationDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      <strong>Resident:</strong> {violation.unit.ownerName || violation.unit.tenantName || "Unknown"}
                    </div>

                    <p className="text-sm text-gray-700 line-clamp-2">
                      {violation.description}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 lg:flex-col lg:w-48">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/violations/${violation.uuid || violation.id}`)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                    
                    <Button
                      variant="default"
                      onClick={() => handleQuickAction(violation, 'approve')}
                      disabled={quickActionMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Quick Approve
                    </Button>
                    
                    <Button
                      variant="destructive"
                      onClick={() => handleQuickAction(violation, 'reject')}
                      disabled={quickActionMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Quick Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Action Dialog */}
        <Dialog open={showQuickActionDialog} onOpenChange={setShowQuickActionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {quickActionType === 'approve' ? 'Quick Approve Violation' : 'Quick Reject Violation'}
              </DialogTitle>
              <DialogDescription>
                {selectedViolation && (
                  <>
                    Reference: {selectedViolation.referenceNumber} | Unit {selectedViolation.unit.unitNumber}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {quickActionType === 'approve' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Fine Amount ($)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quickFineAmount}
                    onChange={e => setQuickFineAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    placeholder="0.00"
                  />
                  {selectedViolation?.category?.defaultFineAmount && (
                    <p className="text-sm text-gray-600 mt-1">
                      Default fine: ${selectedViolation.category.defaultFineAmount.toFixed(2)}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Rejection Reason</label>
                  <Textarea
                    rows={3}
                    placeholder="Enter the reason for rejecting this violation..."
                    value={quickRejectReason}
                    onChange={(e) => setQuickRejectReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowQuickActionDialog(false)}
                disabled={quickActionMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                variant={quickActionType === 'approve' ? 'default' : 'destructive'}
                onClick={handleConfirmQuickAction}
                disabled={quickActionMutation.isPending}
              >
                {quickActionMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  <>
                    {quickActionType === 'approve' ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Confirm {quickActionType === 'approve' ? 'Approval' : 'Rejection'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
} 
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  User,
  Calendar, 
  FileText,
  Loader2,
  MessageCircle,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ViolationStatus, type Violation, type ViolationCategory, type PropertyUnit } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface ViolationDetailProps {
  id: string;
}

interface ViolationHistoryEntry {
  id: number;
  action: string;
  comment?: string | null;
  createdAt: string; // Assuming it's a date string
  userFullName?: string | null;
  commenterName?: string | null; // Added for public commenter's name
}

export function ViolationDetail({ id }: ViolationDetailProps) {
  const { toast } = useToast();
  useAuth(); // Keep auth context active
  const [, navigate] = useLocation();
  const [comment, setComment] = useState("");
  const [showFineModal, setShowFineModal] = useState(false);
  const [pendingApprove, setPendingApprove] = useState(false);
  const [fineInput, setFineInput] = useState<number | "">("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Fetch violation details
  const { data: violation, isLoading } = useQuery<Violation & { unit?: PropertyUnit }>({
    queryKey: [`/api/violations/${id}`],
  });
  
  // Fetch violation history
  const { data: history, isLoading: historyLoading } = useQuery<ViolationHistoryEntry[]>({
    queryKey: [`/api/violations/${id}/history`],
    enabled: !!id,
  });

  // Fetch category details for default fine
  const { data: category, isLoading: categoryLoading } = useReactQuery<ViolationCategory>({
    queryKey: violation?.categoryId ? ["/api/violation-categories/" + violation.categoryId] : [],
    enabled: !!violation?.categoryId,
  });

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: async ({ status, comment, rejectionReason }: { status: ViolationStatus, comment?: string, rejectionReason?: string }) => {
      const res = await apiRequest("PATCH", `/api/violations/${id}/status`, { status, comment, rejectionReason });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/violations/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/violations/${id}/history`] });
      queryClient.invalidateQueries({ queryKey: ["/api/violations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/violations/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/stats"] });
      toast({
        title: "Status updated",
        description: "The violation status has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fine setting mutation
  const fineMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest("PATCH", `/api/violations/${id}/fine`, { amount });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/violations/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/violations/${id}/history`] });
      setFineInput("");
      toast({
        title: "Fine set",
        description: "The fine amount has been set",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to set fine",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async (comment: string) => {
      const res = await apiRequest("POST", `/api/violations/${id}/history`, {
        action: "comment",
        comment,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/violations/${id}/history`] });
      setComment("");
      toast({
        title: "Comment added",
        description: "Your comment has been added",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/violations/${id}`);
      if (!res.ok) {
        throw new Error(await res.text() || 'Failed to delete violation');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Violation deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/violations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/violations/recent'] });
      navigate("/violations");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (status: ViolationStatus, rejectionReason?: string) => {
    statusMutation.mutate({ status, comment: comment || undefined, rejectionReason });
  };

  const handleRejectClick = () => {
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (rejectionReason.trim()) {
      handleStatusChange("rejected", rejectionReason);
      setShowRejectModal(false);
      setRejectionReason("");
    }
  };

  // const handleSetFine = () => {
  //   if (fineAmount === "") return;
  //   fineMutation.mutate(Number(fineAmount));
  // };

  const handleAddComment = () => {
    if (!comment.trim()) return;
    commentMutation.mutate(comment);
  };

  const handleApproveClick = () => {
    setFineInput(category?.defaultFineAmount ?? "");
    setShowFineModal(true);
  };

  const handleConfirmFineAndApprove = async () => {
    if (fineInput === "" || isNaN(Number(fineInput))) return;
    setPendingApprove(true);
    try {
      await fineMutation.mutateAsync(Number(fineInput));
      await statusMutation.mutateAsync({ status: "approved", comment: comment || undefined });
      setShowFineModal(false);
      toast({ title: "Violation approved", description: `Violation approved with fine $${Number(fineInput).toFixed(2)}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setPendingApprove(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!violation) {
    return (
      <div className="flex justify-center p-8">
        <p className="text-neutral-600">Violation not found</p>
      </div>
    );
  }

  // Format violation data for display
  const violationDate = violation?.violationDate ? new Date(violation.violationDate) : null;
  const formattedDate = violationDate ? format(violationDate, "MMM dd, yyyy") : "N/A";
  const formattedTime = violation?.violationTime || "Not specified";

  // Calculate days opened (aging calculation)
  const getDaysOpened = () => {
    if (!violation?.createdAt) return "N/A";
    const createdDate = new Date(violation.createdAt);
    const currentDate = new Date();
    const timeDiff = currentDate.getTime() - createdDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  };

  const daysOpened = getDaysOpened();

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left Column - Details */}
      <div className="md:col-span-2 space-y-6">
        {/* Dispute Alert - Show if violation is disputed */}
        {violation.status === "disputed" && (
          <Card className="border-orange-200 bg-orange-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-2">🚨 Violation Under Dispute</h3>
                <p className="text-sm text-orange-800 mb-3">
                  This violation has been disputed by the unit occupant. Review the dispute details in the history section below 
                  and take appropriate action to either approve or reject the violation.
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleApproveClick}
                    disabled={statusMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Quick Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={handleRejectClick}
                    disabled={statusMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Quick Reject
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          {/* Header with status */}
          <div className="bg-neutral-800 px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{`VIO-${format(new Date(violation.createdAt), 'yyyyMMdd')}-${violation.id.toString().padStart(3, '0')}`}</h2>
                <p className="text-neutral-300 text-sm">
                  Reported on {violation?.createdAt ? format(new Date(violation.createdAt), "MMM dd, yyyy") : "N/A"}
                </p>
              </div>
              <div className="mt-2 md:mt-0">
                <StatusBadge status={violation?.status as ViolationStatus} />
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div>
              <h3 className="text-lg font-medium text-neutral-800 mb-3">Violation Details</h3>
              <div className="bg-neutral-50 rounded-lg p-4">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">Unit</dt>
                    <dd className="text-sm text-neutral-900">#{violation?.unit?.unitNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">Type</dt>
                    <dd className="text-sm text-neutral-900">{getViolationTypeName(violation?.violationType)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">Date/Time</dt>
                    <dd className="text-sm text-neutral-900">{formattedDate} at {formattedTime}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">Bylaw Reference</dt>
                    <dd className="text-sm text-neutral-900">{violation?.bylawReference || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">Days Opened</dt>
                    <dd className="text-sm text-neutral-900">
                      {daysOpened !== "N/A" ? (
                        <span className={`font-medium ${
                          daysOpened === 0 ? "text-green-600" :
                          daysOpened <= 7 ? "text-yellow-600" :
                          daysOpened <= 30 ? "text-orange-600" :
                          "text-red-600"
                        }`}>
                          {daysOpened} {daysOpened === 1 ? "day" : "days"}
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </dd>
                  </div>
                  {violation?.fineAmount !== null && (
                    <div>
                      <dt className="text-sm font-medium text-neutral-500">Fine Amount</dt>
                      <dd className="text-sm text-neutral-900">${violation.fineAmount.toFixed(2)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium text-neutral-800 mb-3">Description</h3>
              <div className="bg-neutral-50 rounded-lg p-4">
                <p className="text-sm text-neutral-700 whitespace-pre-line">
                  {violation.description}
                </p>
              </div>
            </div>
            
            {violation.attachments && violation.attachments.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-neutral-800 mb-3">Evidence</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(violation.attachments as string[]).map((attachment, index) => {
                    const isImage = !attachment.endsWith('.pdf');
                    return isImage ? (
                      <div key={index} className="aspect-w-3 aspect-h-2 rounded-lg overflow-hidden">
                        <a href={`/api/uploads/${attachment}`} target="_blank" rel="noopener noreferrer">
                          <img src={`/api/uploads/${attachment}`} alt={`Evidence ${index + 1}`} className="object-cover hover:opacity-80 transition-opacity" />
                        </a>
                      </div>
                    ) : (
                      <div key={index} className="aspect-w-3 aspect-h-2 bg-neutral-100 rounded-lg flex items-center justify-center">
                        <a href={`/api/uploads/${attachment}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center hover:text-primary transition-colors">
                          <FileText className="h-10 w-10" />
                          <span className="text-xs mt-1">View PDF</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Violation History */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-neutral-800 mb-3">History</h3>
              <div className="bg-neutral-50 rounded-lg p-4">
                {historyLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : history && history.length > 0 ? (
                  <ul className="space-y-3">
                    {history.map((entry: ViolationHistoryEntry) => {
                      let icon;
                      let title;
                      
                      // Determine icon and title based on action
                      if (entry.action === "created") {
                        icon = <Clock className="h-5 w-5 text-white" />;
                        title = "Violation reported";
                      } else if (entry.action.startsWith("status_changed_to_")) {
                        const status = entry.action.replace("status_changed_to_", "");
                        if (status === "approved") {
                          icon = <CheckCircle className="h-5 w-5 text-white" />;
                          title = "Violation approved";
                        } else if (status === "rejected") {
                          icon = <XCircle className="h-5 w-5 text-white" />;
                          title = "Violation rejected";
                        } else if (status === "disputed") {
                          icon = <AlertCircle className="h-5 w-5 text-white" />;
                          title = "Violation disputed";
                        } else if (status === "pending_approval") {
                          icon = <Clock className="h-5 w-5 text-white" />;
                          title = "Pending council approval";
                        } else {
                          icon = <Calendar className="h-5 w-5 text-white" />;
                          title = `Status changed to ${status}`;
                        }
                      } else if (entry.action === "fine_set") {
                        icon = <FileText className="h-5 w-5 text-white" />;
                        title = "Fine amount set";
                      } else if (entry.action === "comment") {
                        icon = <MessageCircle className="h-5 w-5 text-white" />;
                        title = "Comment added";
                      } else {
                        icon = <User className="h-5 w-5 text-white" />;
                        title = entry.action;
                      }
                      
                      const isDisputed = entry.action === "status_changed_to_disputed";
                      
                      return (
                        <li key={entry.id} className={`flex items-start ${isDisputed ? 'bg-orange-50 p-3 rounded-lg border border-orange-200' : ''}`}>
                          <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center mt-1 ${isDisputed ? 'bg-orange-500' : 'bg-primary'}`}>
                            {icon}
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${isDisputed ? 'text-orange-900' : 'text-neutral-900'}`}>{title}</p>
                              {isDisputed && (
                                <Badge className="bg-orange-100 text-orange-800 text-xs border-orange-300">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Requires Action
                                </Badge>
                              )}
                            </div>
                            {entry.comment && (
                              <p className={`text-sm mt-1 ${isDisputed ? 'text-orange-800 font-medium' : 'text-neutral-600'}`}>{entry.comment}</p>
                            )}
                            <p className={`text-xs mt-1 ${isDisputed ? 'text-orange-700' : 'text-neutral-500'}`}>
                              {/* Display userFullName for logged-in users, or commenterName for public comments */}
                              {entry.userFullName ? `${entry.userFullName} - ` : (entry.commenterName ? `${entry.commenterName} (Public) - ` : 'Anonymous - ')}
                              {entry.createdAt ? format(new Date(entry.createdAt), "MMM dd, yyyy 'at' h:mm a") : "N/A"}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-neutral-600 text-sm">No history available</p>
                )}
              </div>
            </div>

            {/* Add Comment */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-neutral-800 mb-3">Add Comment</h3>
              <div className="bg-neutral-50 rounded-lg p-4">
                <Textarea
                  rows={4}
                  placeholder="Add a comment or note about this violation"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="mb-3"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddComment}
                    disabled={commentMutation.isPending || !comment.trim()}
                  >
                    {commentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      "Add Comment"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Right Column - Actions and Contact */}
      <div className="space-y-6">
        {/* Status */}
        <Card className="p-6 mb-4">
          <h3 className="text-lg font-medium text-neutral-800 mb-3">Status</h3>
          <div className="flex items-center gap-2">
            <StatusBadge status={violation.status as ViolationStatus} />
            <span className="text-base font-semibold">
              {(() => {
                switch (violation.status) {
                  case 'pending_approval': return 'Pending Approval';
                  case 'disputed': return 'Disputed';
                  case 'rejected': return 'Rejected';
                  case 'approved': return 'Approved';
                  default: return violation.status.charAt(0).toUpperCase() + violation.status.slice(1);
                }
              })()}
            </span>
          </div>
        </Card>

        {/* Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-neutral-800 mb-3">Actions</h3>
          <div className="space-y-3">
            <Button
              className="w-full"
              variant="default"
              onClick={handleApproveClick}
              disabled={violation.status === "approved" || statusMutation.isPending}
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Approve Violation
            </Button>
            
            <Button
              className="w-full"
              variant="destructive"
              onClick={handleRejectClick}
              disabled={
                violation.status === "rejected" || 
                statusMutation.isPending
              }
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject Violation
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  DELETE VIOLATION
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Violation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this violation? This action cannot be undone and will permanently remove the violation and all its associated history, comments, and attachments.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
        
        {/* Contact Info */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-neutral-800 mb-3">Contact Information</h3>
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-neutral-700">Owner</p>
                {violation?.unit?.ownerName ? (
                  <>
                    <p className="text-sm text-neutral-900">{violation.unit.ownerName}</p>
                    <p className="text-sm text-primary-600">{violation.unit.ownerEmail}</p>
                  </>
                ) : (
                  <p className="text-sm text-neutral-500 italic">No owner information available</p>
                )}
              </div>
              
              <div>
                <p className="text-sm font-medium text-neutral-700">Tenant</p>
                {violation?.unit?.tenantName ? (
                  <>
                    <p className="text-sm text-neutral-900">{violation.unit.tenantName}</p>
                    {violation.unit.tenantEmail && (
                      <p className="text-sm text-primary-600">{violation.unit.tenantEmail}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-neutral-500 italic">No tenant information available</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Fine Modal */}
      <Dialog open={showFineModal} onOpenChange={setShowFineModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Levy Fine</DialogTitle>
            <DialogDescription>
              {categoryLoading ? "Loading..." : category?.defaultFineAmount ? (
                <>Default fine for this category: <b>${category.defaultFineAmount.toFixed(2)}</b></>
              ) : (
                "No default fine set for this category."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Fine Amount ($)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={fineInput}
              onChange={e => setFineInput(e.target.value === "" ? "" : parseFloat(e.target.value))}
              placeholder="0.00"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFineModal(false)} disabled={pendingApprove}>Cancel</Button>
            <Button variant="default" onClick={handleConfirmFineAndApprove} disabled={pendingApprove || fineInput === ""}>
              {pendingApprove ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm and Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Violation</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this violation. This reason will be communicated to the unit occupants.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Rejection Reason</label>
            <Textarea
              rows={4}
              placeholder="Enter the reason for rejecting this violation (e.g., insufficient evidence, procedural error, etc.)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mb-3"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason("");
              }} 
              disabled={statusMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmReject} 
              disabled={statusMutation.isPending || !rejectionReason.trim()}
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

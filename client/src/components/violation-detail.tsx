import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  User,
  Calendar, 
  FileText,
  Loader2,
  MessageCircle
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ViolationStatus } from "@shared/schema";

interface ViolationDetailProps {
  id: string;
}

export function ViolationDetail({ id }: ViolationDetailProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [fineAmount, setFineAmount] = useState<number | "">("");
  
  // Fetch violation details
  const { data: violation, isLoading } = useQuery({
    queryKey: [`/api/violations/${id}`],
  });
  
  // Fetch violation history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: [`/api/violations/${id}/history`],
    enabled: !!id,
  });

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: async ({ status, comment }: { status: ViolationStatus, comment?: string }) => {
      const res = await apiRequest("PATCH", `/api/violations/${id}/status`, { status, comment });
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
      setFineAmount("");
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

  const handleStatusChange = (status: ViolationStatus) => {
    statusMutation.mutate({ status, comment: comment || undefined });
  };

  const handleSetFine = () => {
    if (fineAmount === "") return;
    fineMutation.mutate(Number(fineAmount));
  };

  const handleAddComment = () => {
    if (!comment.trim()) return;
    commentMutation.mutate(comment);
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
  const violationDate = violation.violationDate ? new Date(violation.violationDate) : null;
  const formattedDate = violationDate ? format(violationDate, "MMM dd, yyyy") : "N/A";
  const formattedTime = violation.violationTime || "Not specified";

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
        <Card className="overflow-hidden">
          {/* Header with status */}
          <div className="bg-neutral-800 px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Violation #{violation.id}</h2>
                <p className="text-neutral-300 text-sm">
                  Reported on {violation.createdAt ? format(new Date(violation.createdAt), "MMM dd, yyyy") : "N/A"}
                </p>
              </div>
              <div className="mt-2 md:mt-0">
                <StatusBadge status={violation.status as ViolationStatus} />
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
                    <dd className="text-sm text-neutral-900">#{violation.unit?.unitNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">Type</dt>
                    <dd className="text-sm text-neutral-900">{getViolationTypeName(violation.violationType)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">Date/Time</dt>
                    <dd className="text-sm text-neutral-900">{formattedDate} at {formattedTime}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-neutral-500">Bylaw Reference</dt>
                    <dd className="text-sm text-neutral-900">{violation.bylawReference || "Not specified"}</dd>
                  </div>
                  {violation.fineAmount !== null && (
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
                    {history.map((entry: any) => {
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
                      
                      return (
                        <li key={entry.id} className="flex items-start">
                          <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center mt-1">
                            {icon}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-neutral-900">{title}</p>
                            {entry.comment && (
                              <p className="text-sm text-neutral-600 mt-1">{entry.comment}</p>
                            )}
                            <p className="text-xs text-neutral-500 mt-1">
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
          </div>
        </Card>
      </div>
      
      {/* Right Column - Actions and Contact */}
      <div className="space-y-6">
        {/* Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-neutral-800 mb-3">Actions</h3>
          <div className="space-y-3">
            <Button
              className="w-full"
              variant="default"
              onClick={() => handleStatusChange("approved")}
              disabled={
                violation.status === "approved" || 
                statusMutation.isPending
              }
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
              onClick={() => handleStatusChange("rejected")}
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
            
            {user?.isCouncil && (
              <div className="pt-2">
                <p className="text-sm font-medium text-neutral-700 mb-1">Fine Amount ($)</p>
                <div className="flex">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="flex-1 rounded-r-none"
                  />
                  <Button
                    className="flex-shrink-0 rounded-l-none"
                    onClick={handleSetFine}
                    disabled={fineMutation.isPending || fineAmount === ""}
                  >
                    {fineMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {violation.status !== "disputed" && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleStatusChange("disputed")}
                disabled={statusMutation.isPending}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Mark as Disputed
              </Button>
            )}
            
            {violation.status !== "pending_approval" && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleStatusChange("pending_approval")}
                disabled={statusMutation.isPending}
              >
                <Clock className="h-4 w-4 mr-2" />
                Mark as Pending
              </Button>
            )}
          </div>
        </Card>
        
        {/* Contact Info */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-neutral-800 mb-3">Contact Information</h3>
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-neutral-700">Owner</p>
                <p className="text-sm text-neutral-900">{violation.unit?.ownerName}</p>
                <p className="text-sm text-primary-600">{violation.unit?.ownerEmail}</p>
              </div>
              {violation.unit?.tenantName && (
                <div>
                  <p className="text-sm font-medium text-neutral-700">Tenant</p>
                  <p className="text-sm text-neutral-900">{violation.unit.tenantName}</p>
                  {violation.unit.tenantEmail && (
                    <p className="text-sm text-primary-600">{violation.unit.tenantEmail}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
        
        {/* Add Comment */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-neutral-800 mb-3">Add Comment</h3>
          <Textarea
            rows={4}
            placeholder="Add a comment or note about this violation"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="mt-2 flex justify-end">
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
        </Card>
      </div>
    </div>
  );
}

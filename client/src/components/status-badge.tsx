import { cn } from "@/lib/utils";
import { ViolationStatus } from "#shared/schema";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: ViolationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusDisplay = (status: ViolationStatus) => {
    switch (status) {
      case "new":
        return { label: "New", variant: "blue" };
      case "pending_approval":
        return { label: "Pending Approval", variant: "yellow" };
      case "approved":
        return { label: "Approved", variant: "green" };
      case "disputed":
        return { label: "Disputed", variant: "orange" };
      case "rejected":
        return { label: "Rejected", variant: "red" };
      default:
        return { label: "Unknown", variant: "gray" };
    }
  };

  const { label, variant } = getStatusDisplay(status);

  const variantClassMap = {
    blue: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    yellow: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    green: "bg-green-100 text-green-800 hover:bg-green-100",
    orange: "bg-orange-100 text-orange-800 hover:bg-orange-100",
    red: "bg-red-100 text-red-800 hover:bg-red-100",
    gray: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-medium border-none",
        variantClassMap[variant as keyof typeof variantClassMap],
        className
      )}
    >
      {label}
    </Badge>
  );
}

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
}

export function LoadingOverlay({ 
  isVisible, 
  message = "Loading...", 
  className 
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm",
        className
      )}
    >
      <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center gap-4 max-w-sm mx-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <div className="text-center">
          <p className="text-lg font-medium text-neutral-900">{message}</p>
          <p className="text-sm text-neutral-600 mt-1">Please wait...</p>
        </div>
      </div>
    </div>
  );
} 
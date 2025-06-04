import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  message?: string;
  className?: string;
  variant?: "default" | "overlay" | "inline";
  showMessage?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6", 
  lg: "h-8 w-8",
  xl: "h-12 w-12"
};

const textSizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg", 
  xl: "text-xl"
};

export function LoadingSpinner({ 
  size = "md", 
  message = "Loading...", 
  className,
  variant = "default",
  showMessage = true
}: LoadingSpinnerProps) {
  const spinnerElement = (
    <Loader2 
      className={cn(
        "animate-spin text-primary",
        sizeClasses[size],
        className
      )} 
    />
  );

  const messageElement = showMessage && message && (
    <span className={cn(
      "text-muted-foreground ml-2",
      textSizeClasses[size]
    )}>
      {message}
    </span>
  );

  if (variant === "overlay") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center gap-4 max-w-sm mx-4">
          {spinnerElement}
          {messageElement && (
            <div className="text-center">
              <p className="text-lg font-medium text-neutral-900">{message}</p>
              <p className="text-sm text-neutral-600 mt-1">Please wait...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center justify-center">
        {spinnerElement}
        {messageElement}
      </div>
    );
  }

  // Default variant - centered in container
  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-2">
      {spinnerElement}
      {messageElement}
    </div>
  );
}

// Specific loading components for common use cases
export function ButtonLoading({ 
  size = "sm", 
  message = "Loading...",
  showMessage = false 
}: Omit<LoadingSpinnerProps, "variant">) {
  return (
    <LoadingSpinner 
      size={size} 
      message={message} 
      variant="inline" 
      showMessage={showMessage}
    />
  );
}

export function PageLoading({ 
  message = "Loading..." 
}: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <LoadingSpinner size="lg" message={message} variant="default" />
    </div>
  );
}

export function OverlayLoading({ 
  message = "Processing..." 
}: { message?: string }) {
  return (
    <LoadingSpinner message={message} variant="overlay" />
  );
} 
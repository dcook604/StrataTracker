import { useLoading } from "@/contexts/loading-context";
import { OverlayLoading } from "@/components/ui/loading-spinner";

export function GlobalLoadingOverlay() {
  const { loadingStates, isAnyLoading } = useLoading();

  if (!isAnyLoading()) {
    return null;
  }

  // Find the first loading state with a message, or use a default
  const activeLoadingState = Object.values(loadingStates).find(state => state.isLoading);
  const message = activeLoadingState?.message || "Processing...";

  return <OverlayLoading message={message} />;
} 
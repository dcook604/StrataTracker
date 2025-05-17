import { AlertCircle } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center space-x-2">
      <AlertCircle className="h-6 w-6 text-primary" />
      <span className="text-xl font-semibold text-neutral-800 dark:text-white">Spectrum 4</span>
    </div>
  );
}

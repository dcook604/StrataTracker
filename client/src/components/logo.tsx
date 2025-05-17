import { Building2 } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center space-x-2">
      <Building2 className="h-6 w-6 text-primary" />
      <span className="text-xl font-semibold text-neutral-800 dark:text-white">StrataGuard</span>
    </div>
  );
}

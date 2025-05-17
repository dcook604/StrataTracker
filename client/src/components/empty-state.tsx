import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ 
  title, 
  description, 
  icon = <AlertCircle className="h-8 w-8 text-neutral-400" />,
  action
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
      {action && (
        <Link href={action.href}>
          <Button className="mt-4" variant="outline">
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  );
}

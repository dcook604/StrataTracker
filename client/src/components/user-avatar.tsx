import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

type UserAvatarProps = {
  className?: string;
};

export function UserAvatar({ className = "" }: UserAvatarProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    // You can return a skeleton loader here if you have one
    return <div className={`h-10 w-10 rounded-full bg-gray-200 animate-pulse ${className}`} />;
  }

  if (!user) {
    // Fallback for when there's no user, though this case might be rare in protected routes
    return (
      <Avatar className={className}>
        <AvatarFallback className="bg-primary/10 text-primary">?</AvatarFallback>
      </Avatar>
    );
  }

  // Safely determine user's name from metadata or fall back to email
  const name = user.user_metadata?.full_name || user.email || "";

  // Get initials from the name or email
  const initials = name
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-primary/10 text-primary">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

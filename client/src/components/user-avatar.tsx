import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@shared/schema";

type UserAvatarProps = {
  user: Omit<User, "password"> | null;
  className?: string;
};

export function UserAvatar({ user, className = "" }: UserAvatarProps) {
  if (!user) return null;
  
  // Get the initials from the user's full name
  const initials = user.fullName
    .split(" ")
    .map(name => name[0])
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

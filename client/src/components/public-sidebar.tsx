import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePublicAuth } from "@/hooks/use-public-auth";
import { 
  FileText, 
  LogOut, 
  ChevronDown, 
  ChevronRight,
  Home,
  User,
  AlertTriangle
} from "lucide-react";

interface NavItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  subItems?: Array<{ title: string; href: string; }>;
}

export function PublicSidebar({ className }: { className?: string }) {
  const [location, navigate] = useLocation();
  const { publicUser, logout } = usePublicAuth();
  const [violationsOpen, setViolationsOpen] = useState(true);

  const isActive = (path: string) => {
    return location === path;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems: NavItem[] = [
    {
      title: "Unit Overview",
      icon: <Home className="h-5 w-5" />,
      href: "/public/overview",
    },
    {
      title: "Violations",
      icon: <FileText className="h-5 w-5" />,
      subItems: [
        { title: "All Violations", href: "/public/violations" },
      ],
    },
  ];

  return (
    <div className={cn("flex flex-col h-full bg-background border-r", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b">
        <AlertTriangle className="h-6 w-6 text-blue-600" />
        <span className="font-semibold text-lg">StrataTracker</span>
      </div>

      {/* User Info */}
      {publicUser && (
        <div className="p-4 border-b bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{publicUser.fullName}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Unit {publicUser.unitNumber} • {publicUser.role === 'owner' ? 'Owner' : 'Tenant'}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            if (item.subItems) {
              // Expandable section
              const isViolationsSection = item.title === "Violations";
              const sectionOpen = isViolationsSection ? violationsOpen : false;

              return (
                <div key={item.title}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2 h-10",
                      "hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => {
                      if (isViolationsSection) {
                        setViolationsOpen(!violationsOpen);
                      }
                    }}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.title}</span>
                    {sectionOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  {sectionOpen && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.subItems.map((subItem) => (
                        <Button
                          key={subItem.href}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "w-full justify-start h-8",
                            isActive(subItem.href)
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent hover:text-accent-foreground"
                          )}
                          onClick={() => navigate(subItem.href)}
                        >
                          {subItem.title}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            } else {
              // Regular nav item
              return (
                <Button
                  key={item.title}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-2 h-10",
                    isActive(item.href!)
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => navigate(item.href!)}
                >
                  {item.icon}
                  {item.title}
                </Button>
              );
            }
          })}
        </div>
      </nav>

      {/* Footer with logout */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          End Session
        </Button>
      </div>
    </div>
  );
} 
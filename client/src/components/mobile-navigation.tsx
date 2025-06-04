import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Menu, 
  Home, 
  AlertTriangle, 
  Building2, 
  Users, 
  Settings, 
  FileText, 
  Mail, 
  BookOpen,
  Plus
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/", label: "Dashboard", icon: Home, adminOnly: false },
  { href: "/violations", label: "All Violations", icon: AlertTriangle, adminOnly: false },
  { href: "/violations/new", label: "New Violation", icon: Plus, adminOnly: false },
  { href: "/units", label: "Units", icon: Building2, adminOnly: false },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/bylaws", label: "Bylaws", icon: BookOpen, adminOnly: false },
  { href: "/communications", label: "Communications", icon: Mail, adminOrCouncil: true },
  { href: "/reports", label: "Reports", icon: FileText, adminOrCouncil: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOrCouncil: true },
];

export function MobileNavigation() {
  const [location, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const filteredItems = navigationItems.filter(item => {
    if (item.adminOnly && !user?.isAdmin) return false;
    if (item.adminOrCouncil && !(user?.isAdmin || user?.isCouncilMember)) return false;
    return true;
  });

  const handleNavigation = (href: string) => {
    navigate(href);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="md:hidden fixed top-4 left-4 z-50 bg-background shadow-md"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">StrataTracker</h2>
            {user && (
              <p className="text-sm text-muted-foreground mt-1">
                Welcome, {user.fullName}
              </p>
            )}
          </div>
          
          {/* Navigation Items */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href || 
                  (item.href !== "/" && location.startsWith(item.href));
                
                return (
                  <li key={item.href}>
                    <button
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          
          {/* User Actions */}
          <div className="p-4 border-t">
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => handleNavigation("/profile")}
              >
                Profile Settings
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  // Handle logout
                  window.location.href = "/api/auth/logout";
                }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Enhanced responsive utility hook
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState(() => {
    if (typeof window === 'undefined') return 'desktop';
    return window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop';
  });

  useState(() => {
    if (typeof window === 'undefined') return;

    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 768) setBreakpoint('mobile');
      else if (width < 1024) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };

    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  });

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
  };
} 
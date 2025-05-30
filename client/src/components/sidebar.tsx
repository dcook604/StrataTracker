import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { 
  Home, 
  PlusCircle, 
  FileText, 
  BarChart, 
  Settings, 
  LogOut,
  Menu,
  Users,
  Tags,
  Mail,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const navItems = [
    {
      title: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      href: "/",
    },
    {
      title: "New Violation",
      icon: <PlusCircle className="h-5 w-5" />,
      href: "/violations/new",
    },
    {
      title: "All Violations",
      icon: <FileText className="h-5 w-5" />,
      href: "/violations",
    },
    {
      title: "Bylaws",
      icon: <BookOpen className="h-5 w-5" />,
      href: "/bylaws",
    },
    {
      title: "Communications",
      icon: <Mail className="h-5 w-5" />,
      href: "/communications",
      adminOrCouncil: true,
    },
    {
      title: "Reports",
      icon: <BarChart className="h-5 w-5" />,
      href: "/reports",
    },
    {
      title: "Units",
      icon: <Users className="h-5 w-5" />,
      href: "/units", 
      adminOnly: true,
    },
    {
      title: "Categories",
      icon: <Tags className="h-5 w-5" />,
      href: "/categories",
      adminOnly: true,
    },
    {
      title: "Settings",
      icon: <Settings className="h-5 w-5" />,
      href: "/settings",
      adminOnly: true,
    },
  ];

  const NavContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Header with toggle button */}
      <div className={cn(
        "flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 select-none",
        collapsed ? "h-16 px-2" : "h-16 px-3"
      )}>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight">Spectrum 4</span>
            <span className="text-sm font-normal opacity-80">Violation System</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="h-8 w-8 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className={cn("flex-1 py-3", collapsed ? "px-2" : "px-3")}>
        <nav className="flex flex-col gap-1">
          {navItems
            .filter(item => {
              if (item.adminOnly) return user && user.isAdmin;
              if (item.adminOrCouncil) return user && (user.isAdmin || user.isCouncilMember);
              return true;
            })
            .map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  tabIndex={0}
                  className={cn(
                    "w-full gap-3 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                    collapsed ? "h-10 px-2 justify-center" : "h-10 px-3 justify-start",
                    isActive(item.href)
                      ? "bg-blue-700 text-white font-bold border-l-4 border-blue-500 shadow"
                      : "text-neutral-800 hover:bg-blue-600 hover:text-white dark:text-neutral-200 dark:hover:bg-blue-400 dark:hover:text-white"
                  )}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  title={collapsed ? item.title : undefined}
                >
                  {item.icon}
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </Button>
              </Link>
            ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className={cn(
        "border-t border-neutral-200 dark:border-neutral-800",
        collapsed ? "p-2" : "p-3"
      )}>
        <Button
          variant="ghost"
          className={cn(
            "w-full gap-3 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
            collapsed ? "h-10 px-2 justify-center" : "h-10 px-3 justify-start"
          )}
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300",
        isCollapsed ? "w-16" : "w-56",
        className
      )}>
        <NavContent collapsed={isCollapsed} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <NavContent />
        </SheetContent>
      </Sheet>
    </>
  );
}

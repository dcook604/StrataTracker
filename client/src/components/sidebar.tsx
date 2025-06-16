import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { 
  Home, 
  FileText, 
  BarChart, 
  Settings, 
  LogOut,
  Menu,
  Users,
  Mail,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState, useEffect } from "react";

type SidebarProps = React.HTMLAttributes<HTMLDivElement>;

// Define types for nav items and sub items
interface SubNavItem {
  title: string;
  href: string;
  adminOnly?: boolean;
  adminOrCouncil?: boolean;
}
interface NavItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  adminOnly?: boolean;
  adminOrCouncil?: boolean;
  subItems?: SubNavItem[];
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [violationsOpen, setViolationsOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(location.startsWith('/settings'));

  // Auto-expand appropriate section based on current route
  useEffect(() => {
    if (location.startsWith('/settings')) {
      setSettingsOpen(true);
      setViolationsOpen(false);
    } else if (location.startsWith('/violations') || location.startsWith('/categories')) {
      setViolationsOpen(true);
      setSettingsOpen(false);
    }
  }, [location]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Handler for expandable sections with mutual exclusion
  const handleExpandableClick = (section: 'violations' | 'settings') => {
    if (section === 'violations') {
      setViolationsOpen(prev => !prev);
      setSettingsOpen(false); // Close settings when violations is toggled
    } else if (section === 'settings') {
      setSettingsOpen(prev => !prev);
      setViolationsOpen(false); // Close violations when settings is toggled
    }
  };

  // Handler for regular nav items - collapses all expandable sections
  const handleRegularNavClick = () => {
    setViolationsOpen(false);
    setSettingsOpen(false);
    setOpen(false); // Also close mobile menu
  };

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      href: "/",
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
      title: "Dispute Management",
      icon: <AlertCircle className="h-5 w-5" />,
      href: "/disputes",
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
      title: "Violations",
      icon: <FileText className="h-5 w-5" />,
      subItems: [
        { title: "All Violations", href: "/violations" },
        { title: "Categories", href: "/categories", adminOnly: true },
        { title: "New Violation", href: "/violations/new" },
      ],
    },
    {
      title: "Settings",
      icon: <Settings className="h-5 w-5" />,
      subItems: [
        { title: "Announcements", href: "/settings/announcements", adminOnly: true },
        { title: "Audit Log", href: "/settings/audit-log", adminOnly: true },
        { title: "Email Settings", href: "/settings/email", adminOnly: true },
        { title: "System Settings", href: "/settings/system", adminOnly: true },
        { title: "SMTP Settings", href: "/settings/smtp", adminOnly: true },
        { title: "User Management", href: "/settings/users", adminOnly: true },
      ],
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
          {navItems.map((item) => {
            if (item.subItems) {
              // Expandable sections (Violations and Settings) with sub-items
              const visibleSubItems = item.subItems.filter(sub => {
                if (sub.adminOnly) return user && user.isAdmin;
                if (sub.adminOrCouncil) return user && (user.isAdmin || user.isCouncilMember);
                return true;
              });
              if (visibleSubItems.length === 0) return null;
              
              // Determine which section this is and its open state
              const isViolationsSection = item.title === "Violations";
              const isSettingsSection = item.title === "Settings";
              const sectionOpen = isViolationsSection ? violationsOpen : isSettingsSection ? settingsOpen : false;
              const sectionType = isViolationsSection ? 'violations' : isSettingsSection ? 'settings' : null;
              
              return (
                <div key={item.title} className="mb-1">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full gap-3 font-medium flex items-center justify-between",
                      collapsed ? "h-10 px-2 justify-center" : "h-10 px-3 justify-start",
                      "text-neutral-800 hover:bg-blue-600 hover:text-white dark:text-neutral-200 dark:hover:bg-blue-400 dark:hover:text-white"
                    )}
                    onClick={() => sectionType && handleExpandableClick(sectionType)}
                    aria-expanded={sectionOpen}
                    aria-controls={`${item.title.toLowerCase()}-subnav`}
                    tabIndex={0}
                    title={collapsed ? item.title : undefined}
                  >
                    <span className="flex items-center gap-3">
                      {item.icon}
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </span>
                    {!collapsed && (sectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                  </Button>
                                      {sectionOpen && !collapsed && (
                      <div id={`${item.title.toLowerCase()}-subnav`} className="ml-4 flex flex-col gap-1 mt-1 border-l border-neutral-300 pl-2">
                        {visibleSubItems.map(sub => (
                          <Link key={sub.href} href={sub.href}>
                            <Button
                              variant="ghost"
                              tabIndex={0}
                              className={cn(
                                "w-full text-left font-normal px-3 py-2 text-sm justify-start h-9",
                                isActive(sub.href)
                                  ? "bg-blue-700 text-white font-bold border-l-4 border-blue-500 shadow"
                                  : "text-neutral-800 hover:bg-blue-600 hover:text-white dark:text-neutral-200 dark:hover:bg-blue-400 dark:hover:text-white"
                              )}
                              aria-current={isActive(sub.href) ? "page" : undefined}
                              onClick={() => setOpen(false)}
                            >
                              {sub.title}
                            </Button>
                          </Link>
                        ))}
                      </div>
                    )}
                </div>
              );
            }
            // Regular nav item
            if (item.adminOnly && !(user && user.isAdmin)) return null;
            if (item.adminOrCouncil && !(user && (user.isAdmin || user.isCouncilMember))) return null;
            return (
              <Link key={item.href} href={item.href as string}>
                <Button
                  variant="ghost"
                  tabIndex={0}
                  className={cn(
                    "w-full gap-3 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                    collapsed ? "h-10 px-2 justify-center" : "h-10 px-3 justify-start",
                    isActive(item.href as string)
                      ? "bg-blue-700 text-white font-bold border-l-4 border-blue-500 shadow"
                      : "text-neutral-800 hover:bg-blue-600 hover:text-white dark:text-neutral-200 dark:hover:bg-blue-400 dark:hover:text-white"
                  )}
                  aria-current={isActive(item.href as string) ? "page" : undefined}
                  onClick={handleRegularNavClick}
                  title={collapsed ? item.title : undefined}
                >
                  {item.icon}
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </Button>
              </Link>
            );
          })}
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
            collapsed ? "h-10 px-2 justify-center" : "h-10 px-3 justify-start",
            logoutMutation.isPending && "opacity-70 cursor-not-allowed"
          )}
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          title={collapsed ? "Logout" : undefined}
        >
          {logoutMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
          {!collapsed && (
            <span>
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </span>
          )}
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

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
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
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
      title: "Reports",
      icon: <BarChart className="h-5 w-5" />,
      href: "/reports",
    },
    {
      title: "Customers",
      icon: <Users className="h-5 w-5" />,
      href: "/customers", 
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

  const NavContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex flex-col items-center justify-center h-20 px-4 border-b border-neutral-200 dark:border-neutral-800 select-none">
        <span className="font-bold text-2xl leading-tight">Spectrum 4</span>
        <span className="text-xl font-normal opacity-80" style={{ fontSize: '90%' }}>Violation System</span>
      </div>
      <ScrollArea className="flex-1 px-4 py-4">
        <nav className="flex flex-col gap-1">
          {navItems
            .filter(item => !item.adminOnly || (user && user.isAdmin))
            .map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  tabIndex={0}
                  className={cn(
                    "w-full justify-start gap-2 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                    isActive(item.href)
                      ? "bg-primary-700 text-white font-bold border-l-4 border-primary-500 shadow"
                      : "text-neutral-700 hover:bg-neutral-200 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  )}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.icon}
                  {item.title}
                </Button>
              </Link>
            ))}
          <div className="mt-auto pt-4 border-t border-neutral-200 dark:border-neutral-800 mt-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Logout
            </Button>
          </div>
        </nav>
      </ScrollArea>
    </div>
  );

  return (
    <>
      <aside className={cn("hidden md:flex flex-col w-64 border-r border-neutral-200 dark:border-neutral-800", className)}>
        <NavContent />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <NavContent />
        </SheetContent>
      </Sheet>
    </>
  );
}

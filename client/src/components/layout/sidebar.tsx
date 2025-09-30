import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Phone, 
  Bot, 
  TrendingUp, 
  Users, 
  Settings,
  Menu,
  Key,
  TestTube
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Call History", href: "/calls", icon: Phone },
  { name: "Agent Config", href: "/agents", icon: Bot },
  { name: "Advanced Analytics", href: "/analytics", icon: TrendingUp },
];

const adminNavigation = [
  { name: "User Management", href: "/user-management", icon: Users },
  { name: "Integrations", href: "/integrations", icon: Key },
  { name: "Settings", href: "/settings", icon: Settings },
];

function SidebarContent() {
  const [location] = useLocation();
  const { isAdmin, hasPermission } = useAuth();
  
  return (
    <div className="w-60 md:w-64 bg-sidebar-background text-sidebar-foreground flex flex-col h-full">
      {/* Logo Section */}
      <div className="p-4 md:p-6 border-b border-sidebar-border">
        <h1 className="text-lg md:text-xl font-semibold text-white">AgentPlatform</h1>
        <p className="text-xs md:text-sm text-sidebar-foreground/70 mt-1">Voice AI Management</p>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {navigation.map((item) => {
            const permissionMap: Record<string, string> = {
              "/dashboard": "viewDashboard",
              "/calls": "viewCallHistory",
              "/agents": "viewAgents",
              "/analytics": "viewAnalytics",
            };
            
            const permission = permissionMap[item.href];
            if (permission && !hasPermission(permission)) {
              return null;
            }
            
            const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center p-2.5 md:p-3 rounded-lg transition-colors cursor-pointer touch-manipulation min-h-[44px]",
                    "hover:bg-sidebar-accent active:bg-sidebar-accent/80",
                    isActive && "sidebar-active"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className="mr-2 md:mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="font-medium text-sm md:text-base">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
        
        {isAdmin && (
          <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-sidebar-border">
            <h3 className="px-2 md:px-3 mb-2 md:mb-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Administration
            </h3>
            <div className="space-y-1">
              {adminNavigation.map((item) => {
                const permissionMap: Record<string, string> = {
                  "/user-management": "viewUserManagement",
                  "/integrations": "viewIntegrations",
                  "/settings": "viewSettings",
                };
                
                const permission = permissionMap[item.href];
                if (permission && !hasPermission(permission)) {
                  return null;
                }
                
                const isActive = location === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center p-2.5 md:p-3 rounded-lg transition-colors cursor-pointer touch-manipulation min-h-[44px]",
                        "hover:bg-sidebar-accent active:bg-sidebar-accent/80",
                        isActive && "sidebar-active"
                      )}
                      data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <item.icon className="mr-2 md:mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="font-medium text-sm md:text-base">{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
      
      {/* Footer */}
      <div className="p-3 md:p-4 border-t border-sidebar-border flex-shrink-0">
        <div className="flex items-center justify-center space-x-2 text-xs text-sidebar-foreground/50">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="hidden sm:inline">System Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  
  if (!isMobile) {
    return <SidebarContent />;
  }
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed top-4 left-4 z-50"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-60">
        <div onClick={() => setOpen(false)}>
          <SidebarContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}
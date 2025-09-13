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
  Sparkles,
  Crown
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
    <div className="w-60 h-full relative overflow-hidden">
      {/* Premium Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-indigo-900/20 to-black/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-500/5 to-transparent pointer-events-none" />
      
      {/* Glass Effect Overlay */}
      <div className="absolute inset-0 backdrop-blur-xl bg-black/30" />
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Premium Logo Section */}
        <div className="p-6 border-b border-white/10 relative overflow-hidden">
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 animated-gradient opacity-10" />
          
          <div className="relative flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 backdrop-blur-sm border border-white/10">
              <Crown className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                AgentPlatform
              </h1>
              <p className="text-xs text-gray-400 flex items-center">
                <Sparkles className="h-3 w-3 mr-1 text-yellow-500" />
                <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  Premium Voice AI
                </span>
              </p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
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
                      "group relative flex items-center p-3 rounded-xl transition-all duration-300 cursor-pointer",
                      "hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-indigo-500/10",
                      "hover:backdrop-blur-sm hover:border-white/10 hover:scale-[1.02]",
                      isActive ? [
                        "bg-gradient-to-r from-purple-500/20 to-indigo-500/20",
                        "backdrop-blur-sm border border-purple-500/30",
                        "shadow-[0_0_20px_rgba(168,85,247,0.3)]",
                        "before:absolute before:inset-0 before:rounded-xl",
                        "before:bg-gradient-to-r before:from-purple-500/10 before:to-indigo-500/10",
                        "before:animate-pulse"
                      ] : "border border-transparent"
                    )}
                    data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-400 to-indigo-400 rounded-r-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                    )}
                    
                    {/* Icon with Glow */}
                    <div className={cn(
                      "relative mr-3",
                      isActive && "drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                    )}>
                      <item.icon className={cn(
                        "h-5 w-5 transition-all duration-300",
                        isActive ? "text-purple-400" : "text-gray-400 group-hover:text-purple-300"
                      )} />
                    </div>
                    
                    {/* Text */}
                    <span className={cn(
                      "font-medium transition-all duration-300",
                      isActive 
                        ? "text-white" 
                        : "text-gray-300 group-hover:text-white"
                    )}>
                      {item.name}
                    </span>
                    
                    {/* Hover Effect */}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          
          {isAdmin && (
            <div className="mt-8 pt-8 border-t border-white/10">
              <h3 className="px-3 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                <Crown className="h-3 w-3 mr-2 text-yellow-500" />
                Admin Zone
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
                          "group relative flex items-center p-3 rounded-xl transition-all duration-300 cursor-pointer",
                          "hover:bg-gradient-to-r hover:from-yellow-500/10 hover:to-orange-500/10",
                          "hover:backdrop-blur-sm hover:border-white/10 hover:scale-[1.02]",
                          isActive ? [
                            "bg-gradient-to-r from-yellow-500/20 to-orange-500/20",
                            "backdrop-blur-sm border border-yellow-500/30",
                            "shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                          ] : "border border-transparent"
                        )}
                        data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-yellow-400 to-orange-400 rounded-r-full shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                        )}
                        
                        <div className={cn(
                          "relative mr-3",
                          isActive && "drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                        )}>
                          <item.icon className={cn(
                            "h-5 w-5 transition-all duration-300",
                            isActive ? "text-yellow-400" : "text-gray-400 group-hover:text-yellow-300"
                          )} />
                        </div>
                        
                        <span className={cn(
                          "font-medium transition-all duration-300",
                          isActive 
                            ? "text-white" 
                            : "text-gray-300 group-hover:text-white"
                        )}>
                          {item.name}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>
        
        {/* Premium Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
              <span>Live</span>
            </div>
            <span>•</span>
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Premium Edition
            </span>
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
          className="md:hidden fixed top-4 left-4 z-50 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 backdrop-blur-sm border border-white/10"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5 text-white" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-60 border-r border-white/10">
        <div onClick={() => setOpen(false)}>
          <SidebarContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}
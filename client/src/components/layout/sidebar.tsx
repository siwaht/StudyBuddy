import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Phone, 
  Bot, 
  TrendingUp, 
  Users, 
  Settings 
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Call History", href: "/calls", icon: Phone },
  { name: "Agent Config", href: "/agents", icon: Bot },
  { name: "Advanced Analytics", href: "/analytics", icon: TrendingUp },
];

const adminNavigation = [
  { name: "User Management", href: "/user-management", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-60 bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-white">AgentPlatform</h1>
        <p className="text-sm text-sidebar-foreground/70">ElevenLabs + LiveKit</p>
      </div>
      
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center p-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer",
                    isActive && "sidebar-active"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
        
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-3">
            Admin
          </h3>
          <div className="space-y-2">
            {adminNavigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center p-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer",
                      isActive && "sidebar-active"
                    )}
                    data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    <span>{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

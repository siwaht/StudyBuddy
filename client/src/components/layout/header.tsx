import { useLocation } from "wouter";
import { Calendar, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const getPageInfo = (pathname: string) => {
  switch (pathname) {
    case "/":
    case "/dashboard":
      return {
        title: "Overview Dashboard",
        subtitle: "Real-time analytics and monitoring"
      };
    case "/user-management":
      return {
        title: "User Management",
        subtitle: "Manage platform users and permissions"
      };
    default:
      if (pathname.startsWith("/calls/")) {
        return {
          title: "Call Analysis",
          subtitle: "Detailed call breakdown and insights"
        };
      }
      return {
        title: "Dashboard",
        subtitle: "Real-time analytics and monitoring"
      };
  }
};

export default function Header() {
  const [location] = useLocation();
  const { title, subtitle } = getPageInfo(location);
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-card border-b border-border px-4 md:px-6 py-3 md:py-4">
      <div className="flex justify-between items-center">
        <div className="ml-12 md:ml-0">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground" data-testid="page-title">
            {title}
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground" data-testid="page-subtitle">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Date Range: Last 7 Days</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            aria-label="Log out"
            data-testid="button-logout"
            className="h-10 w-10"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

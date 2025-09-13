import { useLocation } from "wouter";
import { Calendar, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return "?";
    const names = user.username.split(".");
    return names.map(n => n[0].toUpperCase()).join("");
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-12 w-12 rounded-full p-0 hover:opacity-90 transition-opacity"
                data-testid="button-user-menu"
              >
                <div className="w-full h-full bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-base shadow-lg ring-2 ring-purple-500/20 ring-offset-2 ring-offset-background">
                  {getUserInitials()}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-card/95 backdrop-blur-md border-purple-500/20" align="end" forceMount>
              <DropdownMenuLabel className="font-normal pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {getUserInitials()}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">
                      {user?.username}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    <p className="text-xs leading-none text-purple-600 dark:text-purple-400 font-medium capitalize">
                      {user?.role} Account
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950/30">
                <User className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-purple-100 dark:bg-purple-900/30" />
              <DropdownMenuItem
                className="cursor-pointer text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 focus:text-destructive focus:bg-red-50 dark:focus:bg-red-950/30"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span className="font-medium">Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

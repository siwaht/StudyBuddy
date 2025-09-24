import { useLocation } from "wouter";
import { Calendar, LogOut, Wifi, WifiOff, Download, RefreshCw, Share } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

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
  const { isConnected, connectionStats } = useWebSocket();
  const { isInstallable, isUpdateAvailable, installApp, updateApp, shareApp } = usePWA();

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
          
          {/* PWA Actions */}
          {isUpdateAvailable && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={updateApp}
                  className="h-8 w-8 relative"
                  data-testid="button-update-app"
                >
                  <RefreshCw className="h-4 w-4" />
                  <Badge className="absolute -top-1 -right-1 h-3 w-3 p-0 flex items-center justify-center bg-blue-500">
                    !
                  </Badge>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Update available - Click to refresh</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {isInstallable && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={installApp}
                  className="h-8 w-8"
                  data-testid="button-install-app"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Install AgentPlatform app</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={shareApp}
                className="h-8 w-8"
                data-testid="button-share-app"
              >
                <Share className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Share AgentPlatform</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Real-time connection indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-1 text-sm">
                {isConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="hidden sm:inline text-green-600 dark:text-green-400">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-500" />
                    <span className="hidden sm:inline text-red-600 dark:text-red-400">Offline</span>
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                {isConnected ? (
                  <div>
                    <div>Real-time updates active</div>
                    {connectionStats.lastConnected && (
                      <div>Connected: {connectionStats.lastConnected.toLocaleTimeString()}</div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div>Real-time updates unavailable</div>
                    {connectionStats.reconnectAttempts > 0 && (
                      <div>Reconnect attempts: {connectionStats.reconnectAttempts}</div>
                    )}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
          
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

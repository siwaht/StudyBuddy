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
    <header className="bg-card border-b border-border px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4">
      <div className="flex justify-between items-center gap-2 sm:gap-4">
        <div className="ml-12 md:ml-0 flex-1 min-w-0">
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-foreground truncate" data-testid="page-title">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground hidden xs:block truncate" data-testid="page-subtitle">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 flex-shrink-0">
          <div className="hidden lg:flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="whitespace-nowrap">Last 7 Days</span>
          </div>
          
          {/* PWA Actions */}
          {isUpdateAvailable && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={updateApp}
                  className="h-9 w-9 sm:h-10 sm:w-10 relative touch-manipulation"
                  data-testid="button-update-app"
                >
                  <RefreshCw className="h-4 w-4" />
                  <Badge className="absolute -top-1 -right-1 h-3 w-3 p-0 flex items-center justify-center bg-blue-500 text-[10px]">
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
                  className="h-9 w-9 sm:h-10 sm:w-10 touch-manipulation"
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
                className="h-9 w-9 sm:h-10 sm:w-10 touch-manipulation hidden sm:flex"
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
              <div className="flex items-center space-x-1 text-xs sm:text-sm min-h-[44px] justify-center">
                {isConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="hidden md:inline text-green-600 dark:text-green-400 whitespace-nowrap">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="hidden md:inline text-red-600 dark:text-red-400 whitespace-nowrap">Offline</span>
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
            className="h-9 w-9 sm:h-10 sm:w-10 touch-manipulation"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

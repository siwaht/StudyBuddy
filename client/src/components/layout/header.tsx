import { useLocation } from "wouter";
import { Calendar } from "lucide-react";

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

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground" data-testid="page-title">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground" data-testid="page-subtitle">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Date Range: Last 7 Days</span>
          </div>
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
            A
          </div>
        </div>
      </div>
    </header>
  );
}

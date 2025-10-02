import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WebSocketProvider } from "@/hooks/useWebSocket";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Loader as Loader2 } from "lucide-react";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

// Lazy load pages for better performance
const Dashboard = lazy(() => import("@/pages/dashboard"));
const CallDetail = lazy(() => import("@/pages/call-detail"));
const UserManagement = lazy(() => import("@/pages/user-management"));
const Calls = lazy(() => import("@/pages/calls"));
const Agents = lazy(() => import("@/pages/agents"));
const Analytics = lazy(() => import("@/pages/analytics"));
const Settings = lazy(() => import("@/pages/settings"));
const Integrations = lazy(() => import("@/pages/integrations"));
const NotFound = lazy(() => import("@/pages/not-found"));
const LoginPage = lazy(() => import("@/pages/login"));

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

// Admin route component  
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (!isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function Router() {
  console.log("Router rendering");
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/calls">
          <ProtectedRoute>
            <Calls />
          </ProtectedRoute>
        </Route>
        <Route path="/calls/:id">
          <ProtectedRoute>
            <CallDetail />
          </ProtectedRoute>
        </Route>
        <Route path="/agents">
          <ProtectedRoute>
            <Agents />
          </ProtectedRoute>
        </Route>
        <Route path="/analytics">
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        </Route>
        <Route path="/user-management">
          <AdminRoute>
            <UserManagement />
          </AdminRoute>
        </Route>
        <Route path="/integrations">
          <AdminRoute>
            <Integrations />
          </AdminRoute>
        </Route>
        <Route path="/settings">
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppContent() {
  console.log("AppContent rendering");
  const { isAuthenticated } = useAuth();
  console.log("isAuthenticated:", isAuthenticated);

  // Show only router for login page
  if (!isAuthenticated) {
    return <Router />;
  }

  // Show full layout for authenticated users
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 max-w-full">
            <Router />
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  console.log("App component rendering");
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <TooltipProvider>
            <AppContent />
            <Toaster />
            <ScrollToTop />
          </TooltipProvider>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

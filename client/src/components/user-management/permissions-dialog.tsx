import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserWithoutPassword } from "@/lib/types";
import { Shield, Eye, Phone, Bot, TrendingUp, Users, Settings, Key } from "lucide-react";

interface PermissionsDialogProps {
  user: UserWithoutPassword | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Permission {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const PERMISSIONS: Permission[] = [
  {
    key: "viewDashboard",
    label: "View Dashboard",
    description: "Access to the main dashboard and statistics",
    icon: Eye,
  },
  {
    key: "viewCallHistory",
    label: "View Call History",
    description: "Access to call history and recordings",
    icon: Phone,
  },
  {
    key: "viewAgents",
    label: "View Agent Config",
    description: "Access to agent configuration and management",
    icon: Bot,
  },
  {
    key: "viewAnalytics",
    label: "View Advanced Analytics",
    description: "Access to advanced analytics and reports",
    icon: TrendingUp,
  },
  {
    key: "viewUserManagement",
    label: "View User Management",
    description: "Access to user management section",
    icon: Users,
    adminOnly: true,
  },
  {
    key: "viewIntegrations",
    label: "View Integrations",
    description: "Access to integrations and API keys",
    icon: Key,
    adminOnly: true,
  },
  {
    key: "viewSettings",
    label: "View Settings",
    description: "Access to system settings",
    icon: Settings,
    adminOnly: true,
  },
];

export default function PermissionsDialog({ user, isOpen, onClose }: PermissionsDialogProps) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch user permissions
  const { data: userPermissions, isLoading } = useQuery<Record<string, boolean>>({
    queryKey: [`/api/users/${user?.id}/permissions`],
    enabled: !!user && isOpen,
  });

  useEffect(() => {
    if (userPermissions) {
      setPermissions(userPermissions);
    }
  }, [userPermissions]);

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async (newPermissions: Record<string, boolean>) => {
      const response = await apiRequest("PUT", `/api/users/${user?.id}/permissions`, newPermissions);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Permissions Updated",
        description: `Permissions for ${user?.username} have been updated successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/permissions`] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permissions",
        variant: "destructive",
      });
    },
  });

  const handlePermissionToggle = (key: string) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    updatePermissionsMutation.mutate(permissions);
  };

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const visiblePermissions = isAdmin 
    ? PERMISSIONS 
    : PERMISSIONS.filter(p => !p.adminOnly);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="permissions-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Permissions for {user.username}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            {isAdmin && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  Admin users have full access to all features by default. These settings are for reference only.
                </p>
              </div>
            )}
            
            {visiblePermissions.map((permission) => {
              const Icon = permission.icon;
              const isChecked = isAdmin || permissions[permission.key] === true;
              
              return (
                <div
                  key={permission.key}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`permission-${permission.key}`}
                >
                  <Checkbox
                    id={permission.key}
                    checked={isChecked}
                    onCheckedChange={() => handlePermissionToggle(permission.key)}
                    disabled={isAdmin || isLoading}
                    className="mt-1"
                    data-testid={`checkbox-${permission.key}`}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={permission.key}
                      className="flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {permission.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {permission.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isAdmin || updatePermissionsMutation.isPending}
            data-testid="button-save-permissions"
          >
            {updatePermissionsMutation.isPending ? "Saving..." : "Save Permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
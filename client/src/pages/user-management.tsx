import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import UserStats from "@/components/user-management/user-stats";
import UsersTable from "@/components/user-management/users-table";
import type { UserWithoutPassword } from "@/lib/types";
import type { Agent } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function UserManagement() {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
    permissions: {
      viewDashboard: true,
      viewCallHistory: true,
      viewAgents: true,
      viewAnalytics: true,
    },
    agentIds: [] as string[],
  });
  const { toast } = useToast();
  
  const { data: users, isLoading, error } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
  });

  // Fetch all agents for the assignment dropdown
  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/users", userData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create user");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-agents-map"] });
      setIsAddUserOpen(false);
      // Reset form
      setNewUser({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "user",
        permissions: {
          viewDashboard: true,
          viewCallHistory: true,
          viewAgents: true,
          viewAnalytics: true,
        },
        agentIds: [],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !users) {
    return (
      <div className="p-6" data-testid="user-management-error">
        <div className="text-center text-muted-foreground">
          Failed to load users. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="user-management-page">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">User Management</h2>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90" 
          data-testid="button-add-user"
          onClick={() => setIsAddUserOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <UserStats users={users} />
      <UsersTable users={users} />
      
      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with the specified role and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="col-span-3"
                placeholder="john.doe"
                data-testid="input-username"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="col-span-3"
                placeholder="john@example.com"
                data-testid="input-email"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="col-span-3"
                placeholder="Enter password"
                data-testid="input-password"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmPassword" className="text-right">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={newUser.confirmPassword}
                onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                className="col-span-3"
                placeholder="Confirm password"
                data-testid="input-confirm-password"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger className="col-span-3" data-testid="select-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Agent Assignment */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Assign Agents
              </Label>
              <div className="col-span-3 space-y-2">
                {agents && agents.length > 0 ? (
                  <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                    {agents.map((agent) => (
                      <div key={agent.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`agent-${agent.id}`}
                          checked={newUser.agentIds.includes(agent.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewUser({
                                ...newUser,
                                agentIds: [...newUser.agentIds, agent.id],
                              });
                            } else {
                              setNewUser({
                                ...newUser,
                                agentIds: newUser.agentIds.filter((id) => id !== agent.id),
                              });
                            }
                          }}
                          data-testid={`checkbox-agent-${agent.id}`}
                        />
                        <Label
                          htmlFor={`agent-${agent.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {agent.name} ({agent.platform})
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No agents available</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Admin users have access to all agents by default
                </p>
              </div>
            </div>

            {/* Permissions */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Permissions
              </Label>
              <div className="col-span-3 space-y-2">
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="permission-dashboard"
                      checked={newUser.permissions.viewDashboard}
                      onCheckedChange={(checked) =>
                        setNewUser({
                          ...newUser,
                          permissions: { ...newUser.permissions, viewDashboard: !!checked },
                        })
                      }
                      data-testid="checkbox-permission-dashboard"
                    />
                    <Label htmlFor="permission-dashboard" className="text-sm font-normal cursor-pointer">
                      Dashboard
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="permission-calls"
                      checked={newUser.permissions.viewCallHistory}
                      onCheckedChange={(checked) =>
                        setNewUser({
                          ...newUser,
                          permissions: { ...newUser.permissions, viewCallHistory: !!checked },
                        })
                      }
                      data-testid="checkbox-permission-calls"
                    />
                    <Label htmlFor="permission-calls" className="text-sm font-normal cursor-pointer">
                      Call History
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="permission-agents"
                      checked={newUser.permissions.viewAgents}
                      onCheckedChange={(checked) =>
                        setNewUser({
                          ...newUser,
                          permissions: { ...newUser.permissions, viewAgents: !!checked },
                        })
                      }
                      data-testid="checkbox-permission-agents"
                    />
                    <Label htmlFor="permission-agents" className="text-sm font-normal cursor-pointer">
                      Agents
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="permission-analytics"
                      checked={newUser.permissions.viewAnalytics}
                      onCheckedChange={(checked) =>
                        setNewUser({
                          ...newUser,
                          permissions: { ...newUser.permissions, viewAnalytics: !!checked },
                        })
                      }
                      data-testid="checkbox-permission-analytics"
                    />
                    <Label htmlFor="permission-analytics" className="text-sm font-normal cursor-pointer">
                      Analytics
                    </Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  User Management, Integrations, and Settings are admin-only
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddUserOpen(false);
                setNewUser({
                  username: "",
                  email: "",
                  password: "",
                  confirmPassword: "",
                  role: "user",
                  permissions: {
                    viewDashboard: true,
                    viewCallHistory: true,
                    viewAgents: true,
                    viewAnalytics: true,
                  },
                  agentIds: [],
                });
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                // Validate inputs
                if (!newUser.username || !newUser.email || !newUser.password) {
                  toast({
                    title: "Error",
                    description: "Please fill in all required fields",
                    variant: "destructive",
                  });
                  return;
                }

                // Validate passwords match
                if (newUser.password !== newUser.confirmPassword) {
                  toast({
                    title: "Error",
                    description: "Passwords do not match",
                    variant: "destructive",
                  });
                  return;
                }

                // Validate password length
                if (newUser.password.length < 8) {
                  toast({
                    title: "Error",
                    description: "Password must be at least 8 characters",
                    variant: "destructive",
                  });
                  return;
                }

                // Prepare data for API
                const userData = {
                  username: newUser.username,
                  email: newUser.email,
                  password: newUser.password,
                  role: newUser.role,
                  permissions: newUser.permissions,
                  agentIds: newUser.agentIds,
                };

                // Call the API
                createUserMutation.mutate(userData);
              }}
              disabled={createUserMutation.isPending}
              data-testid="button-save-user"
            >
              {createUserMutation.isPending ? "Creating..." : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
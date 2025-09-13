import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Bot, Settings, Shield, Trash2, Edit } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { UserWithoutPassword } from "@/lib/types";
import type { Agent } from "@shared/schema";
import AgentAssignmentDialog from "./agent-assignment-dialog";
import PermissionsDialog from "./permissions-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UsersTableProps {
  users: UserWithoutPassword[];
}

const getRoleColor = (role: string) => {
  switch (role) {
    case "admin":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    case "supervisor":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "analyst":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "viewer":
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

const getStatusColor = (isActive: boolean) => {
  return isActive 
    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
    : "bg-red-100 text-red-800 hover:bg-red-100";
};

const formatLastActive = (lastActive?: string) => {
  if (!lastActive) return "Never";
  
  const now = new Date();
  const lastActiveDate = new Date(lastActive);
  const diffInHours = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
};

const getInitials = (username: string) => {
  const parts = username.split('.');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
};

export default function UsersTable({ users }: UsersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserWithoutPassword | null>(null);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserWithoutPassword | null>(null);
  const [editDialogUser, setEditDialogUser] = useState<UserWithoutPassword | null>(null);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
    isActive: true,
  });
  const { toast } = useToast();

  // Fetch user agents for all users to show counts
  const { data: userAgentsMap, isLoading: isLoadingAgents } = useQuery<Record<string, { count: number; agents: Array<{ id: string; name: string }> }>>({
    queryKey: ["/api/user-agents-map"],
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/users/${userId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-agents-map"] });
      setDeleteConfirmUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}`, updates);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update user");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditDialogUser(null);
      // Reset form
      setEditForm({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "user",
        isActive: true,
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

  const handleAssignAgents = (user: UserWithoutPassword) => {
    setSelectedUser(user);
    setIsAssignmentDialogOpen(true);
  };

  const handleManagePermissions = (user: UserWithoutPassword) => {
    setSelectedUser(user);
    setIsPermissionsDialogOpen(true);
  };

  const handleEdit = (user: UserWithoutPassword) => {
    setEditDialogUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      password: "",
      confirmPassword: "",
      role: user.role,
      isActive: user.isActive,
    });
  };

  const handleSaveEdit = () => {
    // Validate inputs
    if (!editForm.username || !editForm.email) {
      toast({
        title: "Error",
        description: "Username and email are required",
        variant: "destructive",
      });
      return;
    }

    // If password is provided, validate it
    if (editForm.password) {
      if (editForm.password !== editForm.confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return;
      }
      if (editForm.password.length < 8) {
        toast({
          title: "Error",
          description: "Password must be at least 8 characters",
          variant: "destructive",
        });
        return;
      }
    }

    // Prepare updates
    const updates: any = {
      username: editForm.username,
      email: editForm.email,
      role: editForm.role,
      isActive: editForm.isActive,
    };

    // Only include password if it was changed
    if (editForm.password) {
      updates.password = editForm.password;
    }

    updateUserMutation.mutate({ userId: editDialogUser!.id, updates });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <>
      <Card className="shadow-sm" data-testid="users-table">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold">All Users</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-users"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40" data-testid="select-role-filter">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Assigned Agents</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last Active</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/25" data-testid={`user-row-${user.id}`}>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                          {getInitials(user.username)}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {user.username.split('.').map(part => 
                            part.charAt(0).toUpperCase() + part.slice(1)
                          ).join(' ')}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{user.email}</td>
                    <td className="p-4">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getRoleColor(user.role)}`}
                      >
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {user.role === 'admin' ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <Bot className="h-3 w-3 mr-1" />
                            All Agents
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {!isLoadingAgents && userAgentsMap?.[user.id] && (
                            <Badge variant="secondary" className="text-xs">
                              {userAgentsMap[user.id].count} agent{userAgentsMap[user.id].count !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleAssignAgents(user)}
                            data-testid={`button-assign-agents-${user.id}`}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Manage Agents
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatLastActive(user.lastActive)}
                    </td>
                    <td className="p-4">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getStatusColor(user.isActive)}`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {user.role !== 'admin' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary hover:text-primary/80"
                            onClick={() => handleManagePermissions(user)}
                            data-testid={`button-permissions-${user.id}`}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Permissions
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:text-primary/80"
                          onClick={() => handleEdit(user)}
                          data-testid={`button-edit-${user.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive/80"
                          onClick={() => setDeleteConfirmUser(user)}
                          data-testid={`button-delete-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {searchTerm || roleFilter !== "all" 
                  ? "No users match your search criteria." 
                  : "No users found."
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AgentAssignmentDialog
        open={isAssignmentDialogOpen}
        onOpenChange={setIsAssignmentDialogOpen}
        user={selectedUser}
      />
      
      <PermissionsDialog
        user={selectedUser}
        isOpen={isPermissionsDialogOpen}
        onClose={() => setIsPermissionsDialogOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete user <strong>{deleteConfirmUser?.username}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserMutation.mutate(deleteConfirmUser!.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editDialogUser} onOpenChange={(open) => !open && setEditDialogUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Leave password fields empty to keep current password.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-username" className="text-right">
                Username
              </Label>
              <Input
                id="edit-username"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                className="col-span-3"
                data-testid="input-edit-username"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">
                Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="col-span-3"
                data-testid="input-edit-email"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-password" className="text-right">
                New Password
              </Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                className="col-span-3"
                placeholder="Leave empty to keep current password"
                data-testid="input-edit-password"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-confirmPassword" className="text-right">
                Confirm Password
              </Label>
              <Input
                id="edit-confirmPassword"
                type="password"
                value={editForm.confirmPassword}
                onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                className="col-span-3"
                placeholder="Confirm new password"
                data-testid="input-edit-confirm-password"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                Role
              </Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value })}
              >
                <SelectTrigger className="col-span-3" data-testid="select-edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-active" className="text-right">
                Status
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Checkbox
                  id="edit-active"
                  checked={editForm.isActive}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: !!checked })}
                  data-testid="checkbox-edit-active"
                />
                <Label htmlFor="edit-active" className="font-normal cursor-pointer">
                  Active (user can log in)
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogUser(null);
                setEditForm({
                  username: "",
                  email: "",
                  password: "",
                  confirmPassword: "",
                  role: "user",
                  isActive: true,
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
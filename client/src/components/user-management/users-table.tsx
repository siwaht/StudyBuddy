import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Bot, Settings } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UserWithoutPassword } from "@/lib/types";
import type { Agent } from "@shared/schema";
import AgentAssignmentDialog from "./agent-assignment-dialog";

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

  // Fetch user agents for all users to show counts
  const { data: userAgentsMap, isLoading: isLoadingAgents } = useQuery<Record<string, { count: number; agents: Array<{ id: string; name: string }> }>>({
    queryKey: ["/api/user-agents-map"],
  });

  const handleAssignAgents = (user: UserWithoutPassword) => {
    setSelectedUser(user);
    setIsAssignmentDialogOpen(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
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
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
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
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:text-primary/80"
                        data-testid={`button-edit-${user.id}`}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-foreground"
                        data-testid={`button-delete-${user.id}`}
                      >
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

      <AgentAssignmentDialog
        open={isAssignmentDialogOpen}
        onOpenChange={setIsAssignmentDialogOpen}
        user={selectedUser}
      />
    </Card>
  );
}

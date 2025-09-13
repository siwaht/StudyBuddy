import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Agent } from "@shared/schema";
import type { UserWithoutPassword } from "@/lib/types";
import { Bot, Loader2 } from "lucide-react";

interface AgentAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithoutPassword | null;
}

export default function AgentAssignmentDialog({
  open,
  onOpenChange,
  user,
}: AgentAssignmentDialogProps) {
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch all available agents
  const { data: allAgents, isLoading: loadingAllAgents } = useQuery<Agent[]>({
    queryKey: ["/api/all-agents"],
    enabled: open && !!user,
  });

  // Fetch current user's assigned agents
  const { data: userAgents, isLoading: loadingUserAgents } = useQuery<Agent[]>({
    queryKey: [`/api/users/${user?.id}/agents`],
    enabled: open && !!user && user.role !== 'admin',
  });

  // Update agent assignments mutation
  const updateAssignmentsMutation = useMutation({
    mutationFn: async (agentIds: string[]) => {
      if (!user) throw new Error("No user selected");
      return await apiRequest("PUT", `/api/users/${user.id}/agents`, { agentIds });
    },
    onSuccess: () => {
      toast({
        title: "Assignments Updated",
        description: `Agent assignments for ${user?.username} have been updated successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/agents`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-agents-map"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update agent assignments",
        variant: "destructive",
      });
    },
  });

  // Initialize selected agents when dialog opens or user changes
  useEffect(() => {
    if (user?.role === 'admin') {
      // Admins see all agents, no selection needed
      setSelectedAgentIds([]);
    } else if (userAgents) {
      setSelectedAgentIds(userAgents.map(agent => agent.id));
    }
  }, [userAgents, user]);

  const handleToggleAgent = (agentId: string) => {
    setSelectedAgentIds(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSave = () => {
    updateAssignmentsMutation.mutate(selectedAgentIds);
  };

  const isLoading = loadingAllAgents || loadingUserAgents;

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Agents to {user.username}</DialogTitle>
          <DialogDescription>
            {user.role === 'admin' 
              ? "Admin users have access to all agents by default and cannot be modified."
              : "Select which agents this user should have access to. This controls which calls and data they can view."
            }
          </DialogDescription>
        </DialogHeader>

        {user.role === 'admin' ? (
          <div className="py-8 text-center text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Admin users automatically have access to all agents.</p>
            <p className="text-sm mt-2">No assignment changes are needed.</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-5 flex-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {allAgents?.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`agent-checkbox-${agent.id}`}
                    >
                      <Checkbox
                        id={agent.id}
                        checked={selectedAgentIds.includes(agent.id)}
                        onCheckedChange={() => handleToggleAgent(agent.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={agent.id}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {agent.name}
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {agent.platform}
                          </Badge>
                          {agent.isActive ? (
                            <Badge 
                              variant="secondary" 
                              className="text-xs bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                            >
                              Active
                            </Badge>
                          ) : (
                            <Badge 
                              variant="secondary" 
                              className="text-xs bg-gray-100 text-gray-800 hover:bg-gray-100"
                            >
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {agent.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {agent.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="text-sm text-muted-foreground">
              {selectedAgentIds.length} of {allAgents?.length || 0} agents selected
            </div>
          </>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateAssignmentsMutation.isPending}
            data-testid="button-cancel-assignment"
          >
            Cancel
          </Button>
          {user.role !== 'admin' && (
            <Button
              onClick={handleSave}
              disabled={updateAssignmentsMutation.isPending || isLoading}
              data-testid="button-save-assignment"
            >
              {updateAssignmentsMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Assignments
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
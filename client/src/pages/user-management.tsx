import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import UserStats from "@/components/user-management/user-stats";
import UsersTable from "@/components/user-management/users-table";
import type { UserWithoutPassword } from "@/lib/types";

export default function UserManagement() {
  const { data: users, isLoading, error } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
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
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-add-user">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <UserStats users={users} />
      <UsersTable users={users} />
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserCog } from "lucide-react";
import type { UserWithoutPassword } from "@/lib/types";

interface UserStatsProps {
  users: UserWithoutPassword[];
}

export default function UserStats({ users }: UserStatsProps) {
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.isActive).length;
  const adminUsers = users.filter(user => user.role === "admin").length;

  const stats = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Active Users",
      value: activeUsers,
      icon: UserCheck,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      title: "Admin Users",
      value: adminUsers,
      icon: UserCog,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="shadow-sm" data-testid={`user-stat-${index}`}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

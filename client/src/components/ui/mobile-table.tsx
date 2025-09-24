import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface MobileTableProps {
  data: any[];
  columns: {
    key: string;
    label: string;
    render?: (value: any, row: any) => ReactNode;
    format?: (value: any) => string;
    className?: string;
    mobileLabel?: string; // Alternative label for mobile
    hiddenOnMobile?: boolean;
  }[];
  keyField: string;
  title?: string;
  emptyMessage?: string;
  className?: string;
}

export function MobileTable({ 
  data, 
  columns, 
  keyField, 
  title, 
  emptyMessage = "No data available",
  className 
}: MobileTableProps) {
  const isMobile = useIsMobile();

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-muted-foreground text-center py-4">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div className={cn("space-y-3", className)}>
        {title && (
          <h3 className="text-lg font-semibold">{title}</h3>
        )}
        {data.map((row, index) => (
          <Card key={row[keyField] || index} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="space-y-2">
                {columns.filter(col => !col.hiddenOnMobile).map((column) => {
                  const value = row[column.key];
                  const displayValue = column.render 
                    ? column.render(value, row)
                    : column.format 
                    ? column.format(value)
                    : value;

                  return (
                    <div key={column.key} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground font-medium">
                        {column.mobileLabel || column.label}:
                      </span>
                      <span className={cn("text-sm", column.className)}>
                        {displayValue}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className={cn("overflow-x-auto", className)}>
      {title && (
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
      )}
      <div className="min-w-full">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              {columns.map((column) => (
                <th 
                  key={column.key}
                  className="text-left p-3 font-medium text-muted-foreground"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={row[keyField] || index} className="border-b hover:bg-muted/50">
                {columns.map((column) => {
                  const value = row[column.key];
                  const displayValue = column.render 
                    ? column.render(value, row)
                    : column.format 
                    ? column.format(value)
                    : value;

                  return (
                    <td key={column.key} className={cn("p-3", column.className)}>
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Utility component for mobile-friendly metric cards
export function MobileMetricCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  icon: Icon,
  className 
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string };
  icon?: any;
  className?: string;
}) {
  const isMobile = useIsMobile();

  return (
    <Card className={cn("", className)}>
      <CardContent className={cn("p-4", isMobile && "p-3")}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-muted-foreground font-medium",
              isMobile ? "text-xs" : "text-sm"
            )}>
              {title}
            </p>
            <p className={cn(
              "font-bold text-foreground",
              isMobile ? "text-lg" : "text-2xl"
            )}>
              {value}
            </p>
            {subtitle && (
              <p className={cn(
                "text-muted-foreground",
                isMobile ? "text-xs" : "text-sm"
              )}>
                {subtitle}
              </p>
            )}
            {trend && (
              <div className="flex items-center mt-1">
                <Badge 
                  variant={trend.value >= 0 ? "default" : "destructive"}
                  className={isMobile ? "text-xs px-1 py-0" : ""}
                >
                  {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}%
                </Badge>
                <span className={cn(
                  "ml-2 text-muted-foreground",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  {trend.label}
                </span>
              </div>
            )}
          </div>
          {Icon && (
            <Icon className={cn(
              "text-muted-foreground",
              isMobile ? "h-5 w-5" : "h-6 w-6"
            )} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import { ReactElement, cloneElement } from 'react';
import { ResponsiveContainer } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ResponsiveChartProps {
  children: ReactElement;
  height?: number;
  mobileHeight?: number;
  className?: string;
  minHeight?: number;
}

export function ResponsiveChart({ 
  children, 
  height = 300, 
  mobileHeight = 250, 
  className,
  minHeight = 200
}: ResponsiveChartProps) {
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? mobileHeight : height;
  
  // Mobile-specific optimizations for chart components
  const mobileProps = isMobile ? {
    // Reduce margins for mobile
    margin: { top: 5, right: 5, left: 5, bottom: 5 },
    // Simplify axis labels on mobile
    fontSize: 12,
  } : {};

  const enhancedChild = cloneElement(children, {
    ...children.props,
    ...mobileProps,
  });

  return (
    <div 
      className={cn(
        "w-full",
        // Ensure minimum height but allow growth
        `min-h-[${minHeight}px]`,
        // Better spacing on mobile
        isMobile ? "px-1" : "px-4",
        className
      )}
      style={{ height: chartHeight }}
    >
      <ResponsiveContainer 
        width="100%" 
        height="100%"
        minHeight={minHeight}
      >
        {enhancedChild}
      </ResponsiveContainer>
    </div>
  );
}

// Mobile-optimized tooltip component
export function MobileTooltip({ active, payload, label, labelFormatter, formatter }: any) {
  const isMobile = useIsMobile();
  
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className={cn(
      "bg-background border border-border rounded-lg shadow-lg p-3",
      // Smaller tooltip on mobile
      isMobile ? "text-xs max-w-[200px]" : "text-sm max-w-[300px]"
    )}>
      {label && (
        <p className="font-medium mb-1">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-muted-foreground">
          <span 
            className="inline-block w-3 h-3 rounded-full mr-2" 
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: {formatter ? formatter(entry.value, entry.name) : entry.value}
        </p>
      ))}
    </div>
  );
}

// Mobile-optimized legend component
export function MobileLegend({ payload }: any) {
  const isMobile = useIsMobile();
  
  if (!payload || !payload.length) {
    return null;
  }

  return (
    <div className={cn(
      "flex justify-center mt-4",
      // Stack vertically on very small mobile screens
      isMobile ? "flex-wrap gap-2" : "gap-4"
    )}>
      {payload.map((entry: any, index: number) => (
        <div 
          key={index} 
          className={cn(
            "flex items-center",
            isMobile ? "text-xs" : "text-sm"
          )}
        >
          <span 
            className="inline-block w-3 h-3 rounded-full mr-2" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
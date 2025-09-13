import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg",
        "bg-gradient-to-r from-purple-100/30 via-purple-50/30 to-purple-100/30",
        "before:absolute before:inset-0",
        "before:-translate-x-full",
        "before:animate-shimmer",
        "before:bg-gradient-to-r",
        "before:from-transparent before:via-white/50 before:to-transparent",
        "skeleton-pulse animate-fadeIn",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }

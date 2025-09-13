import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-xl p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground backdrop-blur-md transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-white/80 border border-purple-200/30 text-foreground shadow-lg shadow-purple-500/5 hover:shadow-xl hover:border-purple-300/40",
        destructive:
          "bg-red-50/80 border border-red-200/50 text-red-700 shadow-lg shadow-red-500/10 hover:shadow-xl hover:border-red-300/60 [&>svg]:text-red-600",
        success:
          "bg-emerald-50/80 border border-emerald-200/50 text-emerald-700 shadow-lg shadow-emerald-500/10 hover:shadow-xl hover:border-emerald-300/60 [&>svg]:text-emerald-600",
        warning:
          "bg-amber-50/80 border border-amber-200/50 text-amber-700 shadow-lg shadow-amber-500/10 hover:shadow-xl hover:border-amber-300/60 [&>svg]:text-amber-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "mb-1 font-semibold leading-none tracking-tight",
      "bg-gradient-to-r from-purple-900 to-indigo-900 bg-clip-text text-transparent",
      className
    )}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-sm [&_p]:leading-relaxed",
      "text-gray-700",
      className
    )}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }

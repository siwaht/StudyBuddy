import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden transform hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-lg",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 text-white shadow-md hover:shadow-xl hover:from-purple-700 hover:via-purple-800 hover:to-purple-900 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
        destructive:
          "bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white shadow-md hover:shadow-xl hover:from-red-700 hover:via-red-800 hover:to-red-900 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
        outline:
          "border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 hover:border-purple-400/50 hover:shadow-lg text-purple-700 transition-all duration-300",
        secondary:
          "bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white shadow-md hover:shadow-xl hover:from-amber-600 hover:via-amber-700 hover:to-amber-800 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
        ghost: "hover:bg-gradient-to-r hover:from-purple-50/80 hover:to-purple-100/80 hover:text-purple-700 hover:shadow-sm backdrop-blur-sm transition-all duration-300",
        link: "text-purple-600 underline-offset-4 hover:underline hover:text-purple-700 transition-colors duration-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

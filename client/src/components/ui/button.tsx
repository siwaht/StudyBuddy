import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:shadow-lg hover:from-purple-700 hover:to-indigo-700 hover:-translate-y-0.5",
        destructive:
          "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md hover:shadow-lg hover:from-red-700 hover:to-red-800 hover:-translate-y-0.5",
        outline:
          "border-2 border-purple-200 bg-transparent hover:bg-purple-50 hover:border-purple-300 hover:shadow-sm",
        secondary:
          "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 shadow-sm hover:shadow-md hover:from-gray-200 hover:to-gray-300 hover:-translate-y-0.5",
        ghost: "hover:bg-purple-50 hover:text-purple-700",
        link: "text-purple-600 underline-offset-4 hover:underline hover:text-purple-700",
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
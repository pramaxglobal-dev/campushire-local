import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./lib";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary-800 shadow-sm font-semibold",
        destructive: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm font-semibold",
        outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-900 shadow-sm font-medium",
        ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium",
        link: "text-primary underline-offset-4 hover:underline font-medium"
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);

Button.displayName = "Button";

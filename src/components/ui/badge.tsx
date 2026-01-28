import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
  {
    variants: {
      variant: {
        default:
          "bg-primary/20 text-primary border border-primary/30",
        secondary:
          "bg-white/5 text-muted-foreground border border-white/10",
        destructive:
          "bg-red-500/15 text-red-400 border border-red-500/30",
        outline: 
          "text-foreground border border-white/20",
        success:
          "bg-green-500/15 text-green-400 border border-green-500/30",
        warning:
          "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
        info:
          "bg-blue-500/15 text-blue-400 border border-blue-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

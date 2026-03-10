import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:           "border-transparent bg-primary text-primary-foreground",
        secondary:         "border-transparent bg-secondary text-secondary-foreground",
        destructive:       "border-transparent bg-destructive text-destructive-foreground",
        outline:           "text-foreground",
        success:           "border-transparent bg-success text-success-foreground",
        warning:           "border-transparent bg-warning text-warning-foreground",
        // Soft variants — light bg + colored text (more subtle)
        "success-soft":    "border-transparent bg-success-light text-success",
        "warning-soft":    "border-transparent bg-warning-light text-warning",
        "destructive-soft":"border-transparent bg-destructive-light text-destructive",
        "info":            "border-transparent bg-info-light text-info",
        "neutral":         "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
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

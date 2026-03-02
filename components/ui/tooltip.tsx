"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>
  className?: string
}

function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = React.useState(false)

  return (
    <span className="relative inline-flex">
      {React.cloneElement(children, {
        onMouseEnter: () => setVisible(true),
        onMouseLeave: () => setVisible(false),
        onFocus: () => setVisible(true),
        onBlur: () => setVisible(false),
      })}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1",
            "bg-foreground text-background text-xs rounded-md whitespace-nowrap",
            "shadow-md pointer-events-none z-50",
            className
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}

Tooltip.displayName = "Tooltip"

export { Tooltip }

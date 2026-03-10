import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground hover:bg-primary-hover shadow-[var(--shadow-primary-sm)]",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline:     "border border-border bg-transparent hover:bg-muted hover:text-foreground text-foreground",
        secondary:   "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:       "hover:bg-muted hover:text-foreground text-muted-foreground",
        link:        "text-primary underline-offset-4 hover:underline",
        soft:        "bg-primary-light text-primary hover:bg-primary-light/80",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs:  "h-7 rounded-sm px-2.5 text-xs",
        sm:  "h-9 rounded-md px-3",
        lg:  "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-xs": "h-6 w-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    if (asChild && React.isValidElement(props.children)) {
      const child = props.children as React.ReactElement<Record<string, unknown>>;
      return React.cloneElement(child, {
        className: cn(buttonVariants({ variant, size, className }), child.props.className as string),
        ref,
      });
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

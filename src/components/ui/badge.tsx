import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] font-semibold leading-5 transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary",
        info: "bg-info/15 text-info",
        warning: "bg-warning/15 text-warning",
        destructive: "bg-destructive/15 text-destructive",
        secondary: "bg-secondary text-muted-foreground",
        outline: "border border-border text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

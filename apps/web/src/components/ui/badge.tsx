import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "muted" | "destructive" | "success" | "warning" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-primary/20 text-foreground ring-1 ring-inset ring-primary/40",
  muted: "bg-surface-raised text-muted-foreground ring-1 ring-inset ring-border",
  destructive: "bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/40",
  success: "bg-success/15 text-success ring-1 ring-inset ring-success/40",
  warning: "bg-warning/15 text-warning ring-1 ring-inset ring-warning/40",
  outline: "text-muted-foreground ring-1 ring-inset ring-border-strong",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

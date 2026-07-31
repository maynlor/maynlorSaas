import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        // 44px de alto: mismo mínimo táctil que los botones. El fondo es
      // `surface-raised` y no el del panel, para que el campo se lea como un
      // hueco y no como una caja flotando.
      "flex h-11 w-full rounded-md border border-border bg-surface-raised px-3.5 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "destructive" | "subtle";
type Size = "sm" | "md" | "lg";

export const buttonVariants: Record<Variant, string> = {
  default:
    "bg-brand-gradient text-primary-foreground shadow-glow hover:brightness-110 active:brightness-95",
  outline:
    "border border-border-strong bg-surface text-foreground hover:border-primary hover:bg-surface-raised",
  ghost: "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
  subtle: "bg-primary-muted text-foreground hover:bg-primary/30",
  destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
};

export const buttonSizes: Record<Size, string> = {
  // 44px de alto en `md`: es el mínimo táctil recomendado, y este panel se usa
  // desde el celular tanto como desde escritorio.
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export const buttonBase =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      // Deshabilitar mientras carga evita el doble envío, que acá significaría
      // cobrarle dos veces al negocio o mandarle dos mensajes al cliente.
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={cn(buttonBase, buttonSizes[size], buttonVariants[variant], className)}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-90"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconAlert, IconCheck, IconInfo } from "./icons";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {/* Ancho acotado: una línea de texto de 120 caracteres es incómoda de
            leer, y la descripción es justo lo que orienta a quien recién llega. */}
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

type CalloutTone = "info" | "warning" | "success";

const calloutTones: Record<CalloutTone, { wrapper: string; icon: string }> = {
  info: { wrapper: "border-accent/30 bg-accent/10", icon: "text-accent" },
  warning: { wrapper: "border-warning/30 bg-warning/10", icon: "text-warning" },
  success: { wrapper: "border-success/30 bg-success/10", icon: "text-success" },
};

const calloutIcons: Record<CalloutTone, typeof IconInfo> = {
  info: IconInfo,
  warning: IconAlert,
  success: IconCheck,
};

export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: CalloutTone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const IconComponent = calloutIcons[tone];
  return (
    <div className={cn("flex gap-3 rounded-lg border p-4", calloutTones[tone].wrapper, className)}>
      <IconComponent className={cn("mt-0.5 h-5 w-5 shrink-0", calloutTones[tone].icon)} />
      <div className="space-y-1 text-sm leading-relaxed">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

/**
 * Los pasos concretos para dejar una sección funcionando.
 *
 * Existe porque una pantalla vacía con un botón "Crear" no le dice a nadie qué
 * conviene cargar ni por qué: la persona que administra el negocio no conoce el
 * producto, y adivinar el orden correcto es lo que la hace abandonar.
 */
export function SectionGuide({
  steps,
  tip,
  className,
}: {
  steps: { title: string; detail: string }[];
  tip?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-5 shadow-card", className)}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Cómo aprovechar esta sección
      </h2>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-muted text-xs font-bold text-foreground"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">{step.title}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      {tip && (
        <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Recomendación: </span>
          {tip}
        </p>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <p className="text-base font-semibold">{title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * Reserva el alto del contenido que todavía no llegó, para que la página no
 * salte cuando aparece.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-raised", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

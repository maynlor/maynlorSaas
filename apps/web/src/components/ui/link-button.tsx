import Link from "next/link";
import type { ReactNode } from "react";
import { buttonBase, buttonSizes, buttonVariants } from "./button";
import { cn } from "@/lib/utils";

/**
 * Un enlace con aspecto de botón.
 *
 * El `Button` de este proyecto no soporta `asChild` (no usa Radix Slot), así
 * que en vez de anidar un `Link` dentro de un `<button>` —que produce HTML
 * inválido y rompe la navegación con teclado— se reusan sus clases sobre un
 * `<a>` real.
 */
export function LinkButton({
  href,
  variant = "default",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(buttonBase, buttonSizes[size], buttonVariants[variant], className)}
    >
      {children}
    </Link>
  );
}

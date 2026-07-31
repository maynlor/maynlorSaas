import Link from "next/link";
import type { ReactNode } from "react";
import { IconBot, IconCheck } from "@/components/ui/icons";

/**
 * Marco compartido de login y registro.
 *
 * En pantallas anchas muestra una columna con los beneficios: quien llega al
 * registro desde un enlace directo nunca vio la landing, y una caja de email y
 * contraseña sola no le dice a qué se está anotando.
 */
export function AuthShell({
  title,
  subtitle,
  highlights,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  highlights: string[];
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex min-h-screen bg-background">
      <section className="hidden w-1/2 flex-col justify-between bg-aurora border-r border-border p-10 lg:flex xl:p-14">
        <Link href="/" className="flex w-fit items-center gap-2 text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient">
            <IconBot className="h-4 w-4 text-primary-foreground" />
          </span>
          Nexo
        </Link>

        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
            Tu negocio atendiendo por WhatsApp,{" "}
            <span className="text-gradient">las 24 horas</span>
          </h2>
          <ul className="mt-8 space-y-3.5">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-muted">
                  <IconCheck className="h-3 w-3 text-primary" />
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Nexo · Asistentes con IA para tu negocio
        </p>
      </section>

      <section className="flex w-full flex-col justify-center px-4 py-10 sm:px-8 lg:w-1/2">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-8 flex w-fit items-center gap-2 text-lg font-bold lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient">
              <IconBot className="h-4 w-4 text-primary-foreground" />
            </span>
            Nexo
          </Link>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        </div>
      </section>
    </main>
  );
}

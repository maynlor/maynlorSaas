"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  IconBook,
  IconBot,
  IconBox,
  IconChat,
  IconClose,
  IconCreditCard,
  IconDashboard,
  IconHelp,
  IconLogout,
  IconMenu,
  IconSettings,
  IconWrench,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * El orden no es alfabético: sigue el recorrido real de quien configura el
 * asistente — primero mirar cómo va, después atender, después cargar lo que la
 * IA necesita saber, y al final plan y ajustes.
 */
const navGroups = [
  {
    label: "Operación",
    items: [
      { href: "/dashboard", label: "Resumen", icon: IconDashboard },
      { href: "/dashboard/conversations", label: "Conversaciones", icon: IconChat },
    ],
  },
  {
    label: "Lo que sabe tu asistente",
    items: [
      { href: "/dashboard/products", label: "Productos", icon: IconBox },
      { href: "/dashboard/services", label: "Servicios", icon: IconWrench },
      { href: "/dashboard/faqs", label: "Preguntas frecuentes", icon: IconHelp },
      { href: "/dashboard/knowledge", label: "Documentos", icon: IconBook },
    ],
  },
  {
    label: "Cuenta",
    items: [
      { href: "/dashboard/plan", label: "Plan y pagos", icon: IconCreditCard },
      { href: "/dashboard/settings", label: "Configuración", icon: IconSettings },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, business, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Al navegar en móvil el panel lateral debe cerrarse solo: quedarse abierto
  // tapando el contenido recién cargado es el error clásico de este patrón.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <IconBot className="h-8 w-8 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">Cargando tu panel…</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Barra superior solo en móvil, donde el lateral no entra. */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <span className="flex items-center gap-2 font-semibold">
          <IconBot className="h-5 w-5 text-primary" />
          {business?.name ?? "Mi empresa"}
        </span>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          className="cursor-pointer rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
        >
          {menuOpen ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-surface transition-transform duration-200 lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient">
            <IconBot className="h-5 w-5 text-primary-foreground" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{business?.name ?? "Mi empresa"}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary-muted text-foreground"
                            : "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
                        )}
                      >
                        <item.icon className={cn("h-[18px] w-[18px]", active && "text-primary")} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              void logout().finally(() => router.replace("/login"));
            }}
          >
            <IconLogout className="h-[18px] w-[18px]" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="px-4 py-6 sm:px-6 lg:ml-72 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl animate-fade-in-up space-y-8">{children}</div>
      </main>
    </div>
  );
}

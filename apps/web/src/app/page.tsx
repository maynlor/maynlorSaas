"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const BUTTON_BASE =
  "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors";
const BUTTON_VARIANTS = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-border bg-background hover:bg-muted",
  ghost: "hover:bg-muted",
} as const;

function LinkButton({
  href,
  variant = "default",
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof BUTTON_VARIANTS;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], className)}>
      {children}
    </Link>
  );
}

interface PlanLimits {
  maxProducts: number | null;
  maxServices: number | null;
  maxUsers: number | null;
  maxConversationsPerMonth: number | null;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number | null;
  currency: string;
  limits: PlanLimits;
  isActive: boolean;
}

function formatPrice(plan: Plan): string {
  if (plan.priceMonthly === null) return "A medida";
  if (plan.priceMonthly === 0) return "Gratis";
  return `${plan.priceMonthly.toLocaleString("es-AR")} ${plan.currency} / mes`;
}

function formatLimit(value: number | null): string {
  return value === null ? "Ilimitado" : value.toLocaleString("es-AR");
}

const STEPS = [
  {
    title: "Registrá tu empresa",
    description: "Creá tu cuenta en un minuto, sin tarjeta de crédito.",
  },
  {
    title: "Configurá tu asistente",
    description: "Cargá productos, servicios y preguntas frecuentes para que la IA responda con tu información.",
  },
  {
    title: "Conectá WhatsApp",
    description: "Vinculá tu número y empezá a atender clientes automáticamente, 24/7.",
  },
];

function PricingSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: Plan[] }>("/plans");
      setPlans(data.items.filter((p) => p.isActive));
    } catch {
      setError("No se pudieron cargar los planes en este momento.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-center text-sm text-muted-foreground">Cargando planes…</p>;
  }

  if (error) {
    return <p className="text-center text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {plans.map((plan) => (
        <Card key={plan.id}>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-semibold">{formatPrice(plan)}</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>Productos: {formatLimit(plan.limits.maxProducts)}</li>
              <li>Servicios: {formatLimit(plan.limits.maxServices)}</li>
              <li>Usuarios: {formatLimit(plan.limits.maxUsers)}</li>
              <li>Conversaciones/mes: {formatLimit(plan.limits.maxConversationsPerMonth)}</li>
            </ul>
            <LinkButton href="/register" className="w-full">
              Empezar con {plan.name}
            </LinkButton>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold">AI Business Platform</span>
          <nav className="flex items-center gap-2">
            <LinkButton href="/login" variant="ghost">
              Iniciar sesión
            </LinkButton>
            <LinkButton href="/register">Registrá tu empresa</LinkButton>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Un asistente con IA que atiende a tus clientes por vos
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Conectá WhatsApp, cargá tus productos y servicios, y dejá que la IA responda
            automáticamente las 24 horas. Sin código, sin complicaciones.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <LinkButton href="/register" className="h-11 px-6 text-base">
              Empezar gratis
            </LinkButton>
            <LinkButton href="/login" variant="outline" className="h-11 px-6 text-base">
              Ya tengo cuenta
            </LinkButton>
          </div>
        </section>

        <section className="border-t border-border bg-muted/50 py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-semibold">Cómo funciona</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <div key={step.title} className="text-center">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </div>
                  <h3 className="mt-3 font-medium">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-semibold">Planes para cada etapa de tu negocio</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Empezá gratis con Starter y subí de plan cuando lo necesites.
            </p>
          </div>
          <div className="mt-10">
            <PricingSection />
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <p className="text-center text-sm text-muted-foreground">
          AI Business Platform — plataforma multiempresa de asistentes con IA.
        </p>
      </footer>
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) return null;

  return <LandingPage />;
}

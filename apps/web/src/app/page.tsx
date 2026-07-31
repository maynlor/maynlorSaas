"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import {
  IconArrowRight,
  IconBook,
  IconBot,
  IconChat,
  IconCheck,
  IconSparkles,
  IconUserCheck,
} from "@/components/ui/icons";

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
  return `${plan.priceMonthly.toLocaleString("es-AR")} ${plan.currency}`;
}

function formatLimit(value: number | null, unit: string): string {
  return value === null ? `${unit} ilimitados` : `${value.toLocaleString("es-AR")} ${unit}`;
}

const features = [
  {
    icon: IconChat,
    title: "Atiende sin horarios",
    description:
      "Responde consultas por WhatsApp a cualquier hora, incluso fines de semana. Nadie se queda sin respuesta esperando al lunes.",
  },
  {
    icon: IconBook,
    title: "Sabe lo que vos le enseñás",
    description:
      "Cargá tus productos, servicios, preguntas frecuentes y documentos. El asistente responde con esa información, no con inventos.",
  },
  {
    icon: IconUserCheck,
    title: "Vos podés tomar el control",
    description:
      "Cuando una charla se complica, respondés desde el panel y el asistente se hace a un lado hasta que se lo devuelvas.",
  },
  {
    icon: IconSparkles,
    title: "Entiende audios e imágenes",
    description:
      "Si tu cliente manda una nota de voz o una foto, el asistente la interpreta y responde como si la hubieras leído vos.",
  },
];

const steps = [
  {
    title: "Creá tu cuenta",
    description: "Registrás tu empresa en menos de un minuto. No hace falta tarjeta para empezar.",
  },
  {
    title: "Conectá tu WhatsApp",
    description: "Vinculás tu número de WhatsApp Business desde el panel siguiendo los pasos guiados.",
  },
  {
    title: "Cargá tu información",
    description: "Sumás productos, servicios y respuestas frecuentes para que el asistente sepa qué contestar.",
  },
  {
    title: "Empezá a atender",
    description: "Tus clientes escriben como siempre y reciben respuesta al instante. Vos mirás todo desde el panel.",
  },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansError, setPlansError] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  const loadPlans = useCallback(() => {
    api<Plan[]>("/plans")
      .then((data) => setPlans(data.filter((plan) => plan.isActive)))
      .catch(() => setPlansError(true));
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Evita el parpadeo de la landing para alguien que ya tiene sesión abierta.
  if (loading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <IconBot className="h-8 w-8 animate-pulse text-primary" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <span className="flex items-center gap-2 text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient">
              <IconBot className="h-4.5 w-4.5 text-primary-foreground" />
            </span>
            Nexo
          </span>
          <nav className="flex items-center gap-2">
            <LinkButton href="/login" variant="ghost" size="sm">
              Iniciar sesión
            </LinkButton>
            <LinkButton href="/register" size="sm">
              Crear cuenta
            </LinkButton>
          </nav>
        </div>
      </header>

      <main>
        <section className="bg-aurora">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
            <Badge variant="outline" className="mb-6">
              <IconSparkles className="h-3.5 w-3.5 text-primary" />
              Asistentes con IA para PyMEs
            </Badge>
            <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
              Tu negocio atendiendo por WhatsApp,{" "}
              <span className="text-gradient">las 24 horas</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Conectá tu WhatsApp y dejá que un asistente entrenado con la información de tu empresa
              responda consultas, muestre productos y tome pedidos. Cuando haga falta, respondés vos.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <LinkButton href="/register" size="lg">
                Empezar gratis
                <IconArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href="#planes" variant="outline" size="lg">
                Ver planes
              </LinkButton>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Sin tarjeta de crédito · Configuración en minutos
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              No es un chatbot con respuestas armadas
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Es un asistente que conoce tu catálogo, tus horarios y tus condiciones, y que consulta
              esa información antes de responder.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.title} className="transition-colors hover:border-border-strong">
                <CardHeader>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-muted">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </span>
                  <CardTitle className="mt-3 text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-surface/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Cómo se pone en marcha</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Cuatro pasos. No hace falta saber programar ni contratar a nadie.
              </p>
            </div>

            <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="relative">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="planes" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Planes</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Empezá gratis y cambiá de plan cuando tu volumen de consultas lo pida.
            </p>
          </div>

          {plansError ? (
            <p className="mt-12 text-center text-sm text-muted-foreground">
              No pudimos cargar los planes en este momento.{" "}
              <button
                type="button"
                onClick={loadPlans}
                className="cursor-pointer font-medium text-primary underline underline-offset-4"
              >
                Reintentar
              </button>
            </p>
          ) : (
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                // El plan del medio es el que se recomienda: destacarlo es lo
                // que evita que todos elijan el gratis por defecto.
                const highlighted = plan.slug === "pro";
                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      "flex flex-col transition-colors",
                      highlighted && "border-primary/60 shadow-glow",
                    )}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle>{plan.name}</CardTitle>
                        {highlighted && <Badge>Recomendado</Badge>}
                      </div>
                      <p className="pt-2 text-2xl font-bold">
                        {formatPrice(plan)}
                        {plan.priceMonthly !== null && plan.priceMonthly > 0 && (
                          <span className="text-sm font-normal text-muted-foreground"> / mes</span>
                        )}
                      </p>
                      {plan.description && <CardDescription>{plan.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col justify-between gap-6">
                      <ul className="space-y-2.5 text-sm">
                        {[
                          formatLimit(plan.limits.maxConversationsPerMonth, "conversaciones/mes"),
                          formatLimit(plan.limits.maxProducts, "productos"),
                          formatLimit(plan.limits.maxServices, "servicios"),
                          formatLimit(plan.limits.maxUsers, "usuarios"),
                        ].map((line) => (
                          <li key={line} className="flex items-start gap-2">
                            <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                            <span className="text-muted-foreground">{line}</span>
                          </li>
                        ))}
                      </ul>
                      <LinkButton
                        href="/register"
                        variant={highlighted ? "default" : "outline"}
                        className="w-full"
                      >
                        Empezar
                      </LinkButton>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="border-t border-border bg-aurora">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Probalo con tu propio negocio
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Creá la cuenta, cargá diez productos y escribile por WhatsApp. En quince minutos vas a
              saber si te sirve.
            </p>
            <LinkButton href="/register" size="lg" className="mt-8">
              Crear mi cuenta gratis
              <IconArrowRight className="h-4 w-4" />
            </LinkButton>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <IconBot className="h-4 w-4 text-primary" />
            Nexo
          </span>
          <span>© {new Date().getFullYear()} · Asistentes con IA para tu negocio</span>
        </div>
      </footer>
    </div>
  );
}

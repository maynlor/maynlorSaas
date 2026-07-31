"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout, PageHeader, Skeleton } from "@/components/ui/page";
import { LinkButton } from "@/components/ui/link-button";
import { IconArrowRight, IconCheck } from "@/components/ui/icons";
import { LineChart } from "@/components/analytics/line-chart";
import { PlanUsageBar } from "@/components/analytics/plan-usage-bar";
import { cn } from "@/lib/utils";

interface DailyPoint {
  date: string;
  count: number;
}

interface PlanUsage {
  resource: "products" | "services" | "conversations" | "knowledgeDocuments";
  used: number;
  limit: number | null;
}

interface AnalyticsSummary {
  totals: {
    conversations: number;
    messages: number;
    clients: number;
    products: number;
    services: number;
    faqs: number;
    knowledgeDocuments: number;
  };
  conversationsPerDay: DailyPoint[];
  messagesPerDay: DailyPoint[];
  planUsage: PlanUsage[];
}

interface CurrentSubscription {
  status: string;
  plan: { name: string };
}

const PLAN_USAGE_LABEL: Record<PlanUsage["resource"], string> = {
  products: "Productos",
  services: "Servicios",
  conversations: "Conversaciones este mes",
  knowledgeDocuments: "Documentos de conocimiento",
};

/**
 * Lista de puesta en marcha.
 *
 * Un panel con todo en cero no le dice a nadie qué hacer primero. Estos son los
 * pasos mínimos para que el asistente sirva, en el orden en que conviene
 * hacerlos, y desaparece sola cuando están todos cumplidos.
 */
function OnboardingChecklist({
  analytics,
  whatsappConnected,
}: {
  analytics: AnalyticsSummary;
  whatsappConnected: boolean;
}) {
  const tasks = [
    {
      done: whatsappConnected,
      title: "Conectá tu WhatsApp",
      detail: "Sin esto el asistente no puede recibir ni responder mensajes.",
      href: "/dashboard/settings",
      cta: "Conectar",
    },
    {
      done: analytics.totals.products + analytics.totals.services > 0,
      title: "Cargá tus productos o servicios",
      detail: "Es lo que el asistente consulta para responder por precios y disponibilidad.",
      href: "/dashboard/products",
      cta: "Cargar",
    },
    {
      done: analytics.totals.faqs > 0,
      title: "Sumá tus preguntas frecuentes",
      detail: "Horarios, envíos, formas de pago: lo que te preguntan todos los días.",
      href: "/dashboard/faqs",
      cta: "Agregar",
    },
    {
      done: analytics.totals.conversations > 0,
      title: "Probá una conversación real",
      detail: "Escribile a tu propio número y mirá cómo responde antes de darlo a tus clientes.",
      href: "/dashboard/conversations",
      cta: "Ver",
    },
  ];

  const pending = tasks.filter((task) => !task.done);
  if (pending.length === 0) return null;

  const completed = tasks.length - pending.length;

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Terminá de poner en marcha tu asistente</CardTitle>
          <Badge variant="muted">
            {completed} de {tasks.length}
          </Badge>
        </div>
        <CardDescription>
          Con estos pasos tu asistente pasa de estar encendido a ser realmente útil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.title}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-md border p-3.5",
                task.done ? "border-border bg-surface-raised/40" : "border-border-strong bg-surface-raised",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    task.done ? "bg-success/20 text-success" : "bg-primary-muted text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {task.done ? <IconCheck className="h-3 w-3" /> : null}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      task.done && "text-muted-foreground line-through",
                    )}
                  >
                    {task.title}
                  </p>
                  {!task.done && (
                    <p className="text-sm leading-relaxed text-muted-foreground">{task.detail}</p>
                  )}
                </div>
              </div>
              {!task.done && (
                <LinkButton href={task.href} variant="outline" size="sm" className="shrink-0">
                  {task.cta}
                  <IconArrowRight className="h-4 w-4" />
                </LinkButton>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { business } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AnalyticsSummary>("/analytics/summary")
      .then(setAnalytics)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error al cargar las estadísticas"),
      );

    api<CurrentSubscription>("/subscriptions/me")
      .then(setSubscription)
      .catch((err) => {
        if (!(err instanceof ApiError && err.status === 404)) {
          setSubscription(null);
        }
      })
      .finally(() => setSubscriptionLoaded(true));
  }, []);

  const cards = analytics
    ? [
        { label: "Conversaciones", value: analytics.totals.conversations },
        { label: "Mensajes", value: analytics.totals.messages },
        { label: "Clientes", value: analytics.totals.clients },
        { label: "Productos", value: analytics.totals.products },
        { label: "Servicios", value: analytics.totals.services },
        { label: "Preguntas frecuentes", value: analytics.totals.faqs },
      ]
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Resumen"
        description={`Cómo viene funcionando el asistente de ${business?.name ?? "tu empresa"}.`}
      />

      {error && <Callout tone="warning">{error}</Callout>}

      {analytics && (
        <OnboardingChecklist
          analytics={analytics}
          whatsappConnected={Boolean(business?.whatsappPhoneNumberId)}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {analytics
          ? cards.map((card) => (
              <Card key={card.label}>
                <CardHeader className="pb-4">
                  <CardDescription className="text-xs">{card.label}</CardDescription>
                  <p className="text-3xl font-bold tracking-tight">
                    {card.value.toLocaleString("es-AR")}
                  </p>
                </CardHeader>
              </Card>
            ))
          : Array.from({ length: 6 }, (_, index) => (
              <Card key={index}>
                <CardHeader className="gap-3 pb-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardHeader>
              </Card>
            ))}
      </div>

      {analytics && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <LineChart
                title="Conversaciones por día (últimos 30 días)"
                data={analytics.conversationsPerDay}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <LineChart
                title="Mensajes por día (últimos 30 días)"
                data={analytics.messagesPerDay}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tu plan</CardTitle>
            <CardDescription>
              Cuánto de tu plan estás usando. Al llegar al límite, el asistente deja de tomar
              conversaciones nuevas hasta el mes siguiente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!subscriptionLoaded ? (
              <Skeleton className="h-6 w-40" />
            ) : subscription ? (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <Badge>{subscription.plan.name}</Badge>
                <span className="text-muted-foreground">Estado: {subscription.status}</span>
              </p>
            ) : (
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="muted">Sin plan</Badge>
                Todavía no elegiste un plan.
                <Link
                  href="/dashboard/plan"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Ver planes
                </Link>
              </p>
            )}

            {analytics && (
              <div className="space-y-3 border-t border-border pt-4">
                {analytics.planUsage.map((usage) => (
                  <PlanUsageBar
                    key={usage.resource}
                    label={PLAN_USAGE_LABEL[usage.resource]}
                    used={usage.used}
                    limit={usage.limit}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WhatsApp</CardTitle>
            <CardDescription>Estado de la conexión con la API de Meta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {business?.whatsappPhoneNumberId ? (
              <>
                <Badge variant="success">Conectado</Badge>
                <p className="break-all text-sm text-muted-foreground">
                  Phone Number ID: {business.whatsappPhoneNumberId}
                </p>
              </>
            ) : (
              <>
                <Badge variant="warning">Sin conectar</Badge>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Hasta que vincules tu número, el asistente no recibe ni responde mensajes.
                </p>
                <LinkButton href="/dashboard/settings" variant="outline" size="sm">
                  Conectar WhatsApp
                  <IconArrowRight className="h-4 w-4" />
                </LinkButton>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

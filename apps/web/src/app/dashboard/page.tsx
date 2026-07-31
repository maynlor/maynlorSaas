"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart } from "@/components/analytics/line-chart";
import { PlanUsageBar } from "@/components/analytics/plan-usage-bar";

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

export default function DashboardPage() {
  const { business } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AnalyticsSummary>("/analytics/summary")
      .then(setAnalytics)
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar las estadísticas"));

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
        { label: "Documentos", value: analytics.totals.knowledgeDocuments },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Resumen</h1>
        <p className="text-sm text-muted-foreground">
          Estado general de {business?.name ?? "tu empresa"}
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {(analytics ? cards : Array.from({ length: 7 }, (_, i) => ({ label: "", value: null, key: i }))).map(
          (card, i) => (
            <Card key={"label" in card && card.label ? card.label : i}>
              <CardHeader className="pb-2">
                <CardDescription>{card.label || "—"}</CardDescription>
                <CardTitle className="text-3xl">{card.value ?? "—"}</CardTitle>
              </CardHeader>
            </Card>
          ),
        )}
      </div>

      {analytics && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <LineChart title="Conversaciones por día (últimos 30 días)" data={analytics.conversationsPerDay} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <LineChart title="Mensajes por día (últimos 30 días)" data={analytics.messagesPerDay} />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
            <CardDescription>Suscripción actual de tu empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!subscriptionLoaded ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : subscription ? (
              <p className="text-sm">
                <Badge>{subscription.plan.name}</Badge>{" "}
                <span className="text-muted-foreground">Estado: {subscription.status}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Badge variant="muted">Sin plan</Badge> Todavía no elegiste un plan.{" "}
                <Link href="/dashboard/plan" className="font-medium text-foreground underline">
                  Ver planes disponibles
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
            <CardDescription>Estado de la conexión con la API de Meta</CardDescription>
          </CardHeader>
          <CardContent>
            {business?.whatsappPhoneNumberId ? (
              <p className="text-sm">
                <Badge>Conectado</Badge>{" "}
                <span className="text-muted-foreground">
                  Phone Number ID: {business.whatsappPhoneNumberId}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Badge variant="muted">Sin conectar</Badge> Configurá tu número en la sección
                Configuración para que el asistente responda por WhatsApp.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

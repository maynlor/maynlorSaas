"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: string;
  plan: Plan;
}

function formatPrice(plan: Plan): string {
  if (plan.priceMonthly === null) return "A medida";
  if (plan.priceMonthly === 0) return "Gratis";
  return `${plan.priceMonthly.toLocaleString("es-AR")} ${plan.currency} / mes`;
}

function formatLimit(value: number | null): string {
  return value === null ? "Ilimitado" : value.toLocaleString("es-AR");
}

export default function PlanPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSlug, setActionSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansData, sub] = await Promise.all([
        api<{ items: Plan[] }>("/plans"),
        api<Subscription>("/subscriptions/me").catch((err) => {
          if (err instanceof ApiError && err.status === 404) return null;
          throw err;
        }),
      ]);
      setPlans(plansData.items);
      setSubscription(sub);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los planes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const subscribe = async (slug: string) => {
    setActionSlug(slug);
    setError(null);
    try {
      await api("/subscriptions", { method: "POST", body: { planSlug: slug } });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar de plan");
    } finally {
      setActionSlug(null);
    }
  };

  const cancel = async () => {
    if (!window.confirm("¿Cancelar tu suscripción actual?")) return;
    setActionSlug("__cancel__");
    setError(null);
    try {
      await api("/subscriptions/me", { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar la suscripción");
    } finally {
      setActionSlug(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plan y suscripción</h1>
        <p className="text-sm text-muted-foreground">
          Elegí el plan que mejor se adapta al tamaño de tu operación.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Suscripción actual</CardTitle>
            <CardDescription>
              {subscription.plan.name} · vence el{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString("es-AR")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge>{subscription.status}</Badge>
              <Button
                variant="destructive"
                className="h-8 px-3"
                disabled={actionSlug === "__cancel__"}
                onClick={() => void cancel()}
              >
                {actionSlug === "__cancel__" ? "Cancelando…" : "Cancelar suscripción"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan.slug === plan.slug;
          return (
            <Card key={plan.id} className={cn(isCurrent && "border-primary ring-1 ring-primary")}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {isCurrent && <Badge>Actual</Badge>}
                </CardTitle>
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
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent || actionSlug === plan.slug}
                  onClick={() => void subscribe(plan.slug)}
                >
                  {isCurrent
                    ? "Plan actual"
                    : actionSlug === plan.slug
                      ? "Activando…"
                      : "Elegir este plan"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

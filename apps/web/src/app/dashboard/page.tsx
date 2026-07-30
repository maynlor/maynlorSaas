"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, type Paginated } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Stats {
  conversations: number | null;
  products: number | null;
  services: number | null;
  faqs: number | null;
}

interface CurrentSubscription {
  status: string;
  plan: { name: string };
}

export default function DashboardPage() {
  const { business } = useAuth();
  const [stats, setStats] = useState<Stats>({
    conversations: null,
    products: null,
    services: null,
    faqs: null,
  });
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);

  useEffect(() => {
    const count = async (endpoint: string): Promise<number | null> => {
      try {
        const data = await api<Paginated<{ id: string }>>(`${endpoint}?page=1&pageSize=1`);
        return data.total;
      } catch {
        return null;
      }
    };
    void Promise.all([
      count("/conversations"),
      count("/products"),
      count("/services"),
      count("/faqs"),
    ]).then(([conversations, products, services, faqs]) =>
      setStats({ conversations, products, services, faqs }),
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

  const cards = [
    { label: "Conversaciones", value: stats.conversations },
    { label: "Productos", value: stats.products },
    { label: "Servicios", value: stats.services },
    { label: "Preguntas frecuentes", value: stats.faqs },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Resumen</h1>
        <p className="text-sm text-muted-foreground">
          Estado general de {business?.name ?? "tu empresa"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl">{card.value ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>Suscripción actual de tu empresa</CardDescription>
        </CardHeader>
        <CardContent>
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
  );
}

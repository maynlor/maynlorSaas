"use client";

import { useEffect, useState } from "react";
import { api, type Paginated } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Stats {
  conversations: number | null;
  products: number | null;
  services: number | null;
  faqs: number | null;
}

export default function DashboardPage() {
  const { business } = useAuth();
  const [stats, setStats] = useState<Stats>({
    conversations: null,
    products: null,
    services: null,
    faqs: null,
  });

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

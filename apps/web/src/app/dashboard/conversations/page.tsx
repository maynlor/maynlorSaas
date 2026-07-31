"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Paginated } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, SectionGuide, Skeleton } from "@/components/ui/page";
import { IconArrowRight, IconBot, IconChat, IconUserCheck } from "@/components/ui/icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Conversation {
  id: string;
  clientId: string;
  channel: string;
  botPaused: boolean;
  botPausedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ConversationsPage() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Paginated<Conversation>>("/conversations?page=1&pageSize=100")
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar"))
      .finally(() => setLoading(false));
  }, []);

  const attendedByHuman = items.filter((item) => item.botPaused).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Conversaciones"
        description="Todo lo que tus clientes hablaron con el asistente. Podés entrar a cualquier charla, leerla completa y responder vos mismo cuando haga falta."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="muted">{total} en total</Badge>
            {attendedByHuman > 0 && (
              <Badge variant="warning">
                <IconUserCheck className="h-3.5 w-3.5" />
                {attendedByHuman} con vos
              </Badge>
            )}
          </div>
        }
      />

      <SectionGuide
        steps={[
          {
            title: "Revisá lo que respondió la IA",
            detail:
              "Entrá a las primeras conversaciones para ver cómo contesta. Es la forma más rápida de detectar qué información le falta.",
          },
          {
            title: "Tomá la conversación cuando se complique",
            detail:
              "Si el asistente no supo resolver algo, escribí vos desde la misma pantalla: el mensaje le llega al cliente por WhatsApp y la IA se pausa en esa charla.",
          },
          {
            title: "Convertí lo que aprendiste en conocimiento",
            detail:
              "Cada pregunta que la IA no supo responder debería terminar como una FAQ, un producto o un documento. Así no vuelve a pasar.",
          },
        ]}
        tip="Si ves la misma consulta repetida en varias conversaciones, cargala como pregunta frecuente: es lo que más rápido mejora la calidad de las respuestas."
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<IconChat className="h-9 w-9" />}
              title="Todavía no hay conversaciones"
              description="Cuando un cliente le escriba a tu número de WhatsApp, la charla va a aparecer acá automáticamente."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead>Quién responde</TableHead>
                  <TableHead>Última actividad</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((conversation) => (
                  <TableRow key={conversation.id}>
                    <TableCell>
                      <Badge variant="muted" className="capitalize">
                        {conversation.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {conversation.botPaused ? (
                        <Badge variant="warning">
                          <IconUserCheck className="h-3.5 w-3.5" />
                          Vos
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          <IconBot className="h-3.5 w-3.5" />
                          Asistente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(conversation.updatedAt).toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(conversation.createdAt).toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/conversations/${conversation.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-foreground"
                      >
                        Abrir chat
                        <IconArrowRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

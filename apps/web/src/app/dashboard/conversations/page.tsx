"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Paginated } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Conversation {
  id: string;
  clientId: string;
  channel: string;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Conversaciones</h1>
        <span className="text-sm text-muted-foreground">{total} en total</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Todavía no hay conversaciones. Cuando un cliente escriba por WhatsApp van a aparecer acá.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead>Última actividad</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead className="text-right">Mensajes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((conversation) => (
                  <TableRow key={conversation.id}>
                    <TableCell>
                      <Badge variant="muted">{conversation.channel}</Badge>
                    </TableCell>
                    <TableCell>{new Date(conversation.updatedAt).toLocaleString("es-AR")}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(conversation.createdAt).toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/conversations/${conversation.id}`}
                        className="text-sm font-medium underline"
                      >
                        Ver mensajes
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

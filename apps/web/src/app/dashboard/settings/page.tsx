"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout, PageHeader, SectionGuide } from "@/components/ui/page";

export default function SettingsPage() {
  const { business, refreshBusiness } = useAuth();
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPhoneNumberId(business?.whatsappPhoneNumberId ?? "");
  }, [business?.whatsappPhoneNumberId]);

  const connected = Boolean(business?.whatsappPhoneNumberId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api("/businesses/me", { method: "PATCH", body: { phoneNumberId } });
      await refreshBusiness();
      setMessage("Número de WhatsApp vinculado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Configuración"
        description="Los datos de tu empresa y la conexión con WhatsApp. Sin el número vinculado, el asistente no puede recibir ni responder mensajes."
      />

      <Card>
        <CardHeader>
          <CardTitle>Tu empresa</CardTitle>
          <CardDescription>Datos con los que te registraste.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-muted-foreground">Nombre</dt>
              <dd className="mt-0.5 truncate font-medium">{business?.name}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted-foreground">Identificador</dt>
              <dd className="mt-0.5 truncate font-medium">{business?.slug}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="mt-0.5 truncate font-medium">{business?.email}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>WhatsApp Business</CardTitle>
            <Badge variant={connected ? "success" : "warning"}>
              {connected ? "Conectado" : "Sin conectar"}
            </Badge>
          </div>
          <CardDescription>
            Vinculá el número por el que te escriben tus clientes para que el asistente pueda
            atenderlos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <SectionGuide
            steps={[
              {
                title: "Creá una app en Meta for Developers",
                detail:
                  "Entrá a developers.facebook.com, creá una aplicación de tipo Negocio y agregale el producto WhatsApp.",
              },
              {
                title: "Copiá el Phone Number ID",
                detail:
                  "Está en WhatsApp → API Setup, debajo del número. Es una cadena larga de dígitos; no es tu número de teléfono.",
              },
              {
                title: "Configurá el webhook",
                detail:
                  "En WhatsApp → Configuration cargá la URL del webhook y tu token de verificación, y suscribite al campo messages. Si no suscribís ese campo, la verificación queda en verde pero no llega ningún mensaje.",
              },
              {
                title: "Pegá el Phone Number ID acá abajo",
                detail:
                  "Con eso la plataforma sabe que los mensajes que llegan a ese número son de tu empresa.",
              },
            ]}
            tip="Usá un número que no tenga una cuenta de WhatsApp activa: registrar tu número personal en la API de negocios lo saca de la app normal de WhatsApp."
          />

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phoneNumberId">Phone Number ID</Label>
              <Input
                id="phoneNumberId"
                required
                inputMode="numeric"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="123456789012345"
                aria-describedby="phone-hint"
              />
              <p id="phone-hint" className="text-xs leading-relaxed text-muted-foreground">
                Verificá que sea el de la misma app de Meta donde configuraste el webhook. Si no
                coinciden, Meta le entrega los mensajes a otra integración y nunca llegan acá.
              </p>
            </div>

            {message && <Callout tone="success">{message}</Callout>}
            {error && <Callout tone="warning">{error}</Callout>}

            <Button type="submit" loading={saving}>
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

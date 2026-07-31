"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/page";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Ayuda bajo un campo: explica para qué sirve antes de que lo pregunten. */
function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register({
        business: { name: businessName, email: businessEmail, slug },
        user: { email: userEmail, password },
      });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar");
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Creá tu cuenta"
      subtitle="Registrás tu empresa y arrancás con el plan gratuito. No pedimos tarjeta."
      highlights={[
        "Tu asistente atiende por WhatsApp las 24 horas",
        "Responde con tu catálogo, tus horarios y tus condiciones",
        "Empezás gratis y cambiás de plan cuando lo necesites",
      ]}
      footer={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Iniciá sesión
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-6" noValidate>
        {error && <Callout tone="warning">{error}</Callout>}

        <fieldset className="space-y-4">
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tu empresa
          </legend>

          <div className="space-y-1.5">
            <Label htmlFor="businessName">Nombre de la empresa</Label>
            <Input
              id="businessName"
              required
              placeholder="Panadería La Esquina"
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value);
                // El identificador se arma solo hasta que alguien lo edita a
                // mano: pedirlo en frío es la fricción más habitual acá.
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">Identificador</Label>
            <Input
              id="slug"
              required
              value={slug}
              pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
              title="Minúsculas, números y guiones"
              placeholder="panaderia-la-esquina"
              aria-describedby="slug-hint"
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
            />
            <FieldHint>
              <span id="slug-hint">
                Nombre corto e interno de tu empresa dentro de la plataforma. Se completa solo, pero
                podés cambiarlo. Solo minúsculas, números y guiones.
              </span>
            </FieldHint>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="businessEmail">Email de la empresa</Label>
            <Input
              id="businessEmail"
              type="email"
              required
              placeholder="contacto@tuempresa.com"
              aria-describedby="business-email-hint"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
            />
            <FieldHint>
              <span id="business-email-hint">
                Se usa para la facturación y los avisos de la cuenta. Puede ser distinto del tuyo.
              </span>
            </FieldHint>
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-border pt-6">
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tu usuario
          </legend>

          <div className="space-y-1.5">
            <Label htmlFor="userEmail">Tu email</Label>
            <Input
              id="userEmail"
              type="email"
              required
              autoComplete="email"
              placeholder="vos@tuempresa.com"
              aria-describedby="user-email-hint"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
            <FieldHint>
              <span id="user-email-hint">Con este email vas a iniciar sesión en el panel.</span>
            </FieldHint>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </fieldset>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Crear cuenta gratis
        </Button>
      </form>
    </AuthShell>
  );
}

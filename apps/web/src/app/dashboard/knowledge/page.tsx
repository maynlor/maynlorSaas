"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout, PageHeader, SectionGuide } from "@/components/ui/page";

interface KnowledgeDocument {
  id: string;
  title: string;
  sourceType: "text" | "pdf";
  sourceFilename: string | null;
  createdAt: string;
}

export default function KnowledgeDocumentsPage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pdfTitle, setPdfTitle] = useState("");
  const [submitting, setSubmitting] = useState<"text" | "pdf" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ items: KnowledgeDocument[] }>("/knowledge-documents?pageSize=100");
      setDocuments(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los documentos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitText = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting("text");
    setError(null);
    try {
      await api("/knowledge-documents", { method: "POST", body: { title, content } });
      setTitle("");
      setContent("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar el documento");
    } finally {
      setSubmitting(null);
    }
  };

  const submitPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Elegí un archivo PDF");
      return;
    }
    setSubmitting("pdf");
    setError(null);
    try {
      const form = new FormData();
      form.append("title", pdfTitle);
      form.append("file", file);
      await api("/knowledge-documents/upload", { method: "POST", body: form });
      setPdfTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar el PDF");
    } finally {
      setSubmitting(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar este documento? Dejará de usarse en las respuestas del asistente.")) return;
    setDeletingId(id);
    setError(null);
    try {
      await api(`/knowledge-documents/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el documento");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Documentos"
        description="Catálogos, manuales, políticas o cualquier texto largo. El asistente los busca por significado, así responde preguntas que no cubren tus productos, servicios ni las FAQ."
      />

      <SectionGuide
        steps={[
          {
            title: "Subí lo que ya tenés escrito",
            detail:
              "Un PDF de catálogo, las condiciones de garantía, el manual de un producto. No hace falta reescribir nada: se usa tal cual está.",
          },
          {
            title: "Usá esto para lo largo, no para lo puntual",
            detail:
              "Si la respuesta entra en dos líneas, cargala como pregunta frecuente: es más precisa. Los documentos sirven para contenido extenso donde la respuesta está en algún párrafo.",
          },
          {
            title: "Poné títulos que digan de qué se trata",
            detail:
              "\"Política de devoluciones 2026\" ayuda más que \"Documento 3\", tanto para vos como para el asistente.",
          },
        ]}
        tip="Un PDF escaneado como imagen no sirve: solo se puede leer el texto seleccionable. Si no podés copiar texto del PDF, pegalo a mano como texto libre."
      />

      {error && <Callout tone="warning">{error}</Callout>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pegar texto</CardTitle>
            <CardDescription>Para catálogos, políticas o cualquier contenido que ya tengas como texto.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={(e) => void submitText(e)}>
              <input
                className="h-11 w-full rounded-md border border-border bg-surface-raised px-3.5 text-sm transition-colors hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                placeholder="Título (ej. Catálogo 2026)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
              <textarea
                className="h-32 w-full rounded-md border border-border bg-surface-raised px-3.5 py-2.5 text-sm leading-relaxed transition-colors hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                placeholder="Pegá el contenido acá"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={submitting === "text"}>
                {submitting === "text" ? "Cargando…" : "Cargar texto"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subir PDF</CardTitle>
            <CardDescription>Extraemos el texto automáticamente. Máximo 10 MB.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={(e) => void submitPdf(e)}>
              <input
                className="h-11 w-full rounded-md border border-border bg-surface-raised px-3.5 text-sm transition-colors hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                placeholder="Título (ej. Manual de usuario)"
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
                required
                maxLength={200}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="h-11 w-full rounded-md border border-border bg-surface-raised px-3.5 text-sm transition-colors hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                required
              />
              <Button type="submit" className="w-full" disabled={submitting === "pdf"}>
                {submitting === "pdf" ? "Cargando…" : "Cargar PDF"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentos cargados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no cargaste ningún documento.</p>
          ) : (
            <ul className="divide-y divide-border">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString("es-AR")}
                      {doc.sourceFilename ? ` · ${doc.sourceFilename}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="muted">{doc.sourceType === "pdf" ? "PDF" : "Texto"}</Badge>
                    <Button
                      variant="destructive"
                      className="h-8 px-3"
                      disabled={deletingId === doc.id}
                      onClick={() => void remove(doc.id)}
                    >
                      {deletingId === doc.id ? "Eliminando…" : "Eliminar"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

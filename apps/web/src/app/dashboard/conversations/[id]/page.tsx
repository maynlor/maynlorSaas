"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type Paginated } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Callout, Skeleton } from "@/components/ui/page";
import {
  IconArrowLeft,
  IconBot,
  IconSend,
  IconUserCheck,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  clientId: string;
  channel: string;
  botPaused: boolean;
  botPausedAt: string | null;
}

const roleLabels: Record<string, string> = {
  user: "Cliente",
  assistant: "Asistente IA",
  agent: "Vos",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConversationDetailPage() {
  const params = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [togglingBot, setTogglingBot] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    if (!params.id) return;
    const data = await api<Paginated<Message>>(
      `/conversations/${params.id}/messages?page=1&pageSize=100`,
    );
    setMessages(data.items);
  }, [params.id]);

  const loadConversation = useCallback(async () => {
    const data = await api<Paginated<Conversation>>("/conversations?page=1&pageSize=100");
    setConversation(data.items.find((item) => item.id === params.id) ?? null);
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    Promise.all([loadMessages(), loadConversation()])
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar"))
      .finally(() => setLoading(false));
  }, [params.id, loadMessages, loadConversation]);

  /**
   * Un chat que abre arriba de todo obliga a bajar a mano para ver lo último,
   * que es justamente lo único que importa al entrar. Se salta sin animación
   * en la carga inicial —animar un scroll de cientos de mensajes se ve como un
   * defecto— y se anima solo al llegar un mensaje nuevo.
   */
  const initialScrollDone = useRef(false);
  useEffect(() => {
    if (loading || messages.length === 0) return;
    bottomRef.current?.scrollIntoView({
      behavior: initialScrollDone.current ? "smooth" : "auto",
      block: "end",
    });
    initialScrollDone.current = true;
  }, [messages, loading]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setSendError(null);
    try {
      const sent = await api<Message>(`/conversations/${params.id}/reply`, {
        method: "POST",
        body: { message: text },
      });
      setMessages((prev) => [...prev, sent]);
      setDraft("");
      // Responder toma la conversación: hay que reflejarlo sin recargar.
      setConversation((prev) => (prev ? { ...prev, botPaused: true } : prev));
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  }

  async function toggleBot(paused: boolean) {
    setTogglingBot(true);
    try {
      const updated = await api<{ botPaused: boolean; botPausedAt: string | null }>(
        `/conversations/${params.id}/bot`,
        { method: "PATCH", body: { paused } },
      );
      setConversation((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "No se pudo cambiar el modo");
    } finally {
      setTogglingBot(false);
    }
  }

  const botPaused = conversation?.botPaused ?? false;
  const canReply = conversation?.channel === "whatsapp";

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/conversations"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconArrowLeft className="h-4 w-4" />
            Volver a conversaciones
          </Link>
          <h1 className="mt-1.5 flex items-center gap-2 text-xl font-bold sm:text-2xl">
            Conversación
            {conversation && (
              <Badge variant="outline" className="capitalize">
                {conversation.channel}
              </Badge>
            )}
          </h1>
        </div>

        {conversation && (
          <Badge variant={botPaused ? "warning" : "success"}>
            {botPaused ? (
              <>
                <IconUserCheck className="h-3.5 w-3.5" />
                La atendés vos
              </>
            ) : (
              <>
                <IconBot className="h-3.5 w-3.5" />
                Responde la IA
              </>
            )}
          </Badge>
        )}
      </div>

      {botPaused && (
        <Callout tone="warning" title="El asistente está en pausa en esta conversación">
          <p>
            Mientras vos atiendas, la IA no responde: así el cliente no recibe dos respuestas
            distintas. Los mensajes que llegan se siguen guardando acá.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            loading={togglingBot}
            onClick={() => void toggleBot(false)}
          >
            <IconBot className="h-4 w-4" />
            Devolver al asistente
          </Button>
        </Callout>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-2/3" />
              <Skeleton className="ml-auto h-14 w-1/2" />
              <Skeleton className="h-14 w-3/5" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Todavía no hay mensajes en esta conversación.
            </p>
          ) : (
            messages.map((message) => {
              const fromBusiness = message.role !== "user";
              return (
                <div
                  key={message.id}
                  className={cn("flex", fromBusiness ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm sm:max-w-[70%]",
                      message.role === "user" && "bg-surface-raised text-foreground",
                      message.role === "assistant" && "bg-primary-muted text-foreground",
                      // La respuesta escrita por una persona se distingue de la
                      // de la IA: sin eso es imposible auditar quién contestó.
                      message.role === "agent" && "bg-brand-gradient text-primary-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    <p
                      className={cn(
                        "mt-1.5 text-[11px]",
                        message.role === "agent"
                          ? "text-primary-foreground/75"
                          : "text-muted-foreground",
                      )}
                    >
                      {roleLabels[message.role] ?? message.role} · {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {canReply ? (
          <form onSubmit={handleSend} className="border-t border-border p-3 sm:p-4">
            {sendError && <p className="mb-2 text-sm text-destructive">{sendError}</p>}
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Escribí tu respuesta… (Enter para enviar, Shift+Enter para nueva línea)"
                aria-label="Tu respuesta"
                rows={2}
                className="min-h-[52px] resize-none"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend(event);
                  }
                }}
              />
              <Button type="submit" loading={sending} disabled={!draft.trim()} className="shrink-0">
                <IconSend className="h-4 w-4" />
                <span className="hidden sm:inline">Enviar</span>
              </Button>
            </div>
            {!botPaused && (
              <p className="mt-2 text-xs text-muted-foreground">
                Si respondés, el asistente se pausa en esta conversación hasta que lo devuelvas.
              </p>
            )}
          </form>
        ) : (
          <div className="border-t border-border p-4">
            <p className="text-xs text-muted-foreground">
              Solo se puede responder a mano en conversaciones de WhatsApp. Esta llegó por el canal{" "}
              <span className="font-medium text-foreground">{conversation?.channel ?? "—"}</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

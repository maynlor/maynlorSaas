"use client";

import { ResourceCrud } from "@/components/resource-crud";
import { Badge } from "@/components/ui/badge";

interface Faq {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
}

export default function FaqsPage() {
  return (
    <ResourceCrud<Faq>
      title="Preguntas frecuentes"
      description="Las respuestas exactas a lo que siempre te preguntan: horarios, formas de pago, envíos, garantías. Es la forma más rápida de mejorar lo que contesta el asistente."
      endpoint="/faqs"
      emptyTitle="Todavía no cargaste preguntas frecuentes"
      emptyMessage="Pensá en las tres preguntas que más te hacen por WhatsApp y cargalas. Es el cambio que más se nota en la calidad de las respuestas."
      guideSteps={[
        {
          title: "Mirá tus conversaciones reales",
          detail:
            "Entrá a la sección de Conversaciones y buscá qué se repite. Esas son las preguntas que valen la pena cargar, no las que uno imagina.",
        },
        {
          title: "Escribí la pregunta como la escribe el cliente",
          detail:
            "\"¿Hacen envíos?\" funciona mejor que \"Política de despacho de mercadería\". El asistente busca por parecido con lo que el cliente escribió.",
        },
        {
          title: "Respondé completo y cerrado",
          detail:
            "La respuesta se usa tal cual. Si decís \"consultá con un asesor\", eso es exactamente lo que va a contestar el asistente.",
        },
      ]}
      guideTip="Cada vez que tengas que intervenir a mano en una conversación, preguntate si eso debería ser una FAQ. Si la respuesta es sí, cargala ahí mismo y no vuelve a pasar."
      fields={[
        { name: "question", label: "Pregunta", type: "text", required: true },
        { name: "answer", label: "Respuesta", type: "textarea", required: true },
        { name: "isActive", label: "Activa", type: "checkbox" },
      ]}
      columns={[
        { header: "Pregunta", render: (f) => f.question },
        {
          header: "Respuesta",
          render: (f) => (
            <span className="block max-w-md truncate text-muted-foreground">{f.answer}</span>
          ),
        },
        {
          header: "Estado",
          render: (f) =>
            f.isActive ? <Badge variant="success">Activa</Badge> : <Badge variant="muted">Inactiva</Badge>,
        },
      ]}
    />
  );
}

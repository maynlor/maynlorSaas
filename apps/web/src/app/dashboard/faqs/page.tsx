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
      endpoint="/faqs"
      emptyMessage="Todavía no cargaste preguntas frecuentes."
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
            f.isActive ? <Badge>Activa</Badge> : <Badge variant="muted">Inactiva</Badge>,
        },
      ]}
    />
  );
}

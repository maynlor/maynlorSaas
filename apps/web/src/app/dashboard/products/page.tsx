"use client";

import { ResourceCrud } from "@/components/resource-crud";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  stock: number | null;
  isActive: boolean;
}

export default function ProductsPage() {
  return (
    <ResourceCrud<Product>
      title="Productos"
      description="Lo que vendés. El asistente consulta esta lista cuando un cliente pregunta por precios, stock o características, así responde con datos reales en vez de improvisar."
      endpoint="/products"
      emptyTitle="Todavía no cargaste productos"
      emptyMessage="Sumá los primeros y el asistente va a poder responder consultas de precio y disponibilidad al instante."
      guideSteps={[
        {
          title: "Empezá por lo que más te preguntan",
          detail:
            "No hace falta cargar el catálogo entero de entrada. Con los diez o veinte productos más consultados ya cubrís la mayoría de las conversaciones.",
        },
        {
          title: "Escribí descripciones como se lo explicarías a un cliente",
          detail:
            "Colores, talles, materiales, qué incluye. Todo lo que pongas acá es lo que el asistente puede usar para responder; lo que falte, no lo va a saber.",
        },
        {
          title: "Mantené el stock al día",
          detail:
            "Si un producto se agotó, marcalo como inactivo o poné el stock en cero. Así el asistente deja de ofrecerlo y no prometés lo que no tenés.",
        },
      ]}
      guideTip="El nombre es lo que el asistente usa para encontrar el producto cuando el cliente lo menciona. Escribilo como lo diría tu cliente, no con el código interno."
      fields={[
        { name: "name", label: "Nombre", type: "text", required: true },
        { name: "price", label: "Precio", type: "number", required: true },
        { name: "currency", label: "Moneda (ej: ARS)", type: "text", placeholder: "ARS" },
        { name: "stock", label: "Stock", type: "number" },
        { name: "description", label: "Descripción", type: "textarea" },
        { name: "isActive", label: "Activo", type: "checkbox" },
      ]}
      columns={[
        { header: "Nombre", render: (p) => p.name },
        {
          header: "Precio",
          render: (p) => `${p.price.toLocaleString("es-AR")} ${p.currency}`,
        },
        { header: "Stock", render: (p) => (p.stock === null ? "—" : p.stock) },
        {
          header: "Estado",
          render: (p) =>
            p.isActive ? <Badge variant="success">Activo</Badge> : <Badge variant="muted">Inactivo</Badge>,
        },
      ]}
    />
  );
}

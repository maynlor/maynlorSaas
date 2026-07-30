"use client";

import { ResourceCrud } from "@/components/resource-crud";
import { Badge } from "@/components/ui/badge";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  durationMinutes: number | null;
  isActive: boolean;
}

export default function ServicesPage() {
  return (
    <ResourceCrud<Service>
      title="Servicios"
      endpoint="/services"
      emptyMessage="Todavía no cargaste servicios."
      fields={[
        { name: "name", label: "Nombre", type: "text", required: true },
        { name: "price", label: "Precio", type: "number", required: true },
        { name: "currency", label: "Moneda (ej: ARS)", type: "text", placeholder: "ARS" },
        { name: "durationMinutes", label: "Duración (minutos)", type: "number" },
        { name: "description", label: "Descripción", type: "textarea" },
        { name: "isActive", label: "Activo", type: "checkbox" },
      ]}
      columns={[
        { header: "Nombre", render: (s) => s.name },
        {
          header: "Precio",
          render: (s) => `${s.price.toLocaleString("es-AR")} ${s.currency}`,
        },
        {
          header: "Duración",
          render: (s) => (s.durationMinutes === null ? "—" : `${s.durationMinutes} min`),
        },
        {
          header: "Estado",
          render: (s) =>
            s.isActive ? <Badge>Activo</Badge> : <Badge variant="muted">Inactivo</Badge>,
        },
      ]}
    />
  );
}

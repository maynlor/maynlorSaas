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
      description="Lo que hacés y cuánto cuesta. El asistente usa esta lista para responder por precios, duración y qué incluye cada servicio."
      endpoint="/services"
      emptyTitle="Todavía no cargaste servicios"
      emptyMessage="Si tu negocio ofrece servicios además de productos, cargalos acá para que el asistente pueda cotizarlos."
      guideSteps={[
        {
          title: "Cargá primero los que más se consultan",
          detail:
            "Los servicios que aparecen todos los días en las consultas son los que más rápido te ahorran tiempo de respuesta.",
        },
        {
          title: "Completá la duración",
          detail:
            "Cuando el cliente pregunta cuánto tarda algo, el asistente responde con este dato. Sin él, no puede contestar esa pregunta.",
        },
        {
          title: "Aclará qué incluye y qué no",
          detail:
            "La descripción es donde evitás malentendidos: si el precio no incluye materiales o traslado, decilo acá.",
        },
      ]}
      guideTip="Si tenés precios que dependen del caso, poné un precio de referencia y aclará en la descripción de qué depende. Es mejor que dejarlo vacío."
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
            s.isActive ? <Badge variant="success">Activo</Badge> : <Badge variant="muted">Inactivo</Badge>,
        },
      ]}
    />
  );
}

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
      endpoint="/products"
      emptyMessage="Todavía no cargaste productos."
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
            p.isActive ? <Badge>Activo</Badge> : <Badge variant="muted">Inactivo</Badge>,
        },
      ]}
    />
  );
}

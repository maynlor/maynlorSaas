"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, type Paginated } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, SectionGuide, Skeleton } from "@/components/ui/page";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "number" | "textarea" | "checkbox";
  required?: boolean;
  placeholder?: string;
}

export interface ColumnDef<T> {
  header: string;
  render: (item: T) => ReactNode;
}

interface ResourceCrudProps<T extends { id: string }> {
  title: string;
  /** Para qué sirve esta sección, en una frase que entienda quien recién llega. */
  description: string;
  endpoint: string;
  fields: FieldDef[];
  columns: ColumnDef<T>[];
  emptyTitle: string;
  emptyMessage: string;
  /** Pasos concretos para dejar la sección útil. */
  guideSteps: { title: string; detail: string }[];
  guideTip?: string;
}

type FormValues = Record<string, string | boolean>;

function emptyValues(fields: FieldDef[]): FormValues {
  return Object.fromEntries(
    fields.map((f) => [f.name, f.type === "checkbox" ? true : ""]),
  );
}

function toPayload(fields: FieldDef[], values: FormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.name];
    if (field.type === "checkbox") {
      payload[field.name] = Boolean(value);
      continue;
    }
    const text = String(value ?? "").trim();
    if (text === "") continue;
    payload[field.name] = field.type === "number" ? Number(text) : text;
  }
  return payload;
}

export function ResourceCrud<T extends { id: string }>({
  title,
  description,
  endpoint,
  fields,
  columns,
  emptyTitle,
  emptyMessage,
  guideSteps,
  guideTip,
}: ResourceCrudProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>(emptyValues(fields));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Paginated<T>>(`${endpoint}?page=1&pageSize=100`);
      setItems(data.items);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (item: T) => {
    setEditingId(item.id);
    const record = item as unknown as Record<string, unknown>;
    setValues(
      Object.fromEntries(
        fields.map((f) => {
          const raw = record[f.name];
          if (f.type === "checkbox") return [f.name, raw !== false];
          return [f.name, raw === null || raw === undefined ? "" : String(raw)];
        }),
      ),
    );
  };

  const cancelEdit = () => {
    setEditingId(null);
    setValues(emptyValues(fields));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(fields, values);
      if (editingId) {
        await api(`${endpoint}/${editingId}`, { method: "PATCH", body: payload });
      } else {
        await api(endpoint, { method: "POST", body: payload });
      }
      cancelEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      await api(`${endpoint}/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        description={description}
        actions={<Badge variant="muted">{total} en total</Badge>}
      />

      <SectionGuide steps={guideSteps} tip={guideTip} />

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar registro" : "Agregar nuevo"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                <Label htmlFor={field.name}>{field.label}</Label>
                <div className="mt-1.5">
                  {field.type === "textarea" ? (
                    <Textarea
                      id={field.name}
                      value={String(values[field.name] ?? "")}
                      placeholder={field.placeholder}
                      required={field.required}
                      onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                    />
                  ) : field.type === "checkbox" ? (
                    <input
                      id={field.name}
                      type="checkbox"
                      className="h-5 w-5 cursor-pointer accent-[hsl(262_83%_62%)]"
                      checked={Boolean(values[field.name])}
                      onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.checked }))}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type}
                      step={field.type === "number" ? "any" : undefined}
                      value={String(values[field.name] ?? "")}
                      placeholder={field.placeholder}
                      required={field.required}
                      onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                    />
                  )}
                </div>
              </div>
            ))}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={saving}>
                {editingId ? "Guardar cambios" : "Crear"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState title={emptyTitle} description={emptyMessage} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.header}>{col.header}</TableHead>
                  ))}
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    {columns.map((col) => (
                      <TableCell key={col.header}>{col.render(item)}</TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => void remove(item.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

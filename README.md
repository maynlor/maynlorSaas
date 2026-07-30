# AI Business Platform

Plataforma SaaS multiempresa para asistentes de IA de atención al cliente. Ver [CLAUDE.md](CLAUDE.md) para la visión y las reglas de arquitectura del proyecto.

## Quickstart

```bash
pnpm install
docker compose up -d
pnpm --filter backend migrate:up
pnpm --filter backend dev
```

El servidor arranca en `http://localhost:3000`.

## Estructura

- `apps/backend` — API en Node/Express/TypeScript, Clean Architecture (domain/application/infrastructure/presentation/shared), multi-tenant.
- `packages/` — código compartido entre apps (reservado, vacío por ahora).

## Módulo de referencia: Businesses

El módulo `apps/backend/src/modules/businesses` es el patrón a copiar para nuevos módulos:

- `domain/` — entidades y value objects, sin dependencias externas.
- `application/` — casos de uso, DTOs, interfaces de repositorio (puertos).
- `infrastructure/` — implementaciones concretas (Postgres) de los puertos.
- `presentation/` — controladores, rutas y validación HTTP.

`businesses` es la raíz del tenant y por eso no filtra por `business_id`. Todo módulo nuevo que pertenezca a una empresa debe requerir `businessId` en cada método de su repositorio y filtrar toda query por esa columna.

## IA y herramientas (tool calling)

El AI Engine (`apps/backend/src/modules/ai`) expone la abstracción `AIProvider` y la interfaz `AITool`. `OpenAIProvider` implementa el loop de function calling: si el modelo pide una herramienta, la ejecuta y le devuelve el resultado hasta obtener la respuesta final.

Las herramientas viven en el módulo dueño de los datos y se crean scoped al `businessId` de la conversación, así una empresa nunca puede consultar los datos de otra. `app.ts` las inyecta en el módulo de conversaciones vía una factory `(businessId) => AITool[]`.

Herramientas disponibles: `buscar_productos` (products), `buscar_servicios` (services), `buscar_faq` (knowledge).

Módulos actuales: `auth`, `businesses`, `users`, `clients`, `conversations`, `products`, `services`, `knowledge` (FAQ), `ai`, `whatsapp` (webhook oficial de Meta). Endpoints CRUD autenticados en `/products`, `/services` y `/faqs`.

## Comandos

```bash
pnpm --filter backend dev              # servidor en watch mode
pnpm --filter backend migrate:up       # aplica migraciones pendientes
pnpm --filter backend test:unit        # tests unitarios
pnpm --filter backend test:integration # tests de integración (requiere Docker)
pnpm --filter backend typecheck
pnpm --filter backend lint
```

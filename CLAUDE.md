# AI Business Platform

## Visión

Este proyecto NO es un chatbot.

Este proyecto NO es un bot para WhatsApp.

Este proyecto es una plataforma SaaS multiempresa cuyo objetivo es permitir que cualquier empresa pueda crear un asistente inteligente impulsado por IA para atender clientes automáticamente.

El objetivo es construir una empresa de software.

Todas las decisiones técnicas deberán favorecer la escalabilidad, mantenibilidad y calidad del código.

Nunca priorizar velocidad de desarrollo por encima de arquitectura.

---

# Filosofía

Pensar siempre como una startup tecnológica.

Cada decisión debe permitir que la plataforma pueda crecer desde:

1 empresa

↓

10 empresas

↓

100 empresas

↓

1000 empresas

↓

10000 empresas

sin necesidad de reescribir el sistema.

---

# Objetivos

La plataforma debe permitir que cualquier empresa pueda:

- registrarse
- crear una cuenta
- conectar su WhatsApp
- configurar su IA
- cargar productos
- cargar servicios
- cargar FAQ
- responder automáticamente
- gestionar conversaciones
- visualizar estadísticas

Todo desde un panel web.

---

# Stack tecnológico

## Frontend

- Next.js
- React
- TypeScript
- TailwindCSS
- shadcn/ui

---

## Backend

- Node.js
- Express
- TypeScript

---

## Base de datos

PostgreSQL mediante Supabase.

Nunca depender de una base de datos específica.

Toda la lógica debe estar desacoplada.

---

## IA

Proveedor inicial:

OpenAI

La arquitectura debe permitir incorporar posteriormente:

- Claude
- Gemini
- Grok
- Mistral
- Llama

sin modificar el resto del sistema.

Debe existir una abstracción AIProvider.

---

## Hosting

Primera etapa

Render

Escalado

Railway

---

## Storage

Supabase Storage

---

## Emails

Resend

---

## Logs

Sentry

---

## Analytics

PostHog

---

## Cache

Redis

---

## Colas

BullMQ

---

# Arquitectura

Aplicar Clean Architecture.

Separar:

Application

Domain

Infrastructure

Presentation

Shared

Modules

No escribir lógica de negocio dentro de controladores.

No acceder directamente a la base de datos desde controladores.

Todo debe pasar por casos de uso.

---

# Patrones

Utilizar:

SOLID

Repository Pattern

Dependency Injection

DTO

Value Objects

Factories

Services

Middlewares

Validation

Error Handling

Logging

Nunca escribir código acoplado.

---

# Multi Tenant

El sistema debe ser completamente multiempresa.

Cada empresa posee:

- configuración
- prompt
- conocimiento
- productos
- clientes
- conversaciones
- métricas
- suscripción

Nunca mezclar datos entre empresas.

Toda consulta debe filtrar por business_id.

---

# Módulos

Authentication

Businesses

Users

Clients

Conversations

Messages

Products

Services

Knowledge

AI

WhatsApp

Instagram

Analytics

Dashboard

Payments

Subscriptions

Settings

Notifications

Logs

Cada módulo debe ser independiente.

---

# Inteligencia Artificial

Toda la IA debe centralizarse en un AI Engine.

El AI Engine debe soportar:

Texto

Audio

Imagen

Video

PDF

Documentos

Embeddings

Tool Calling

Memoria

RAG

Streaming

Debe ser independiente del proveedor.

---

# Prompt Engine

Nunca construir prompts gigantes.

El prompt debe construirse dinámicamente.

Debe incluir únicamente:

Empresa

Personalidad

Horarios

Promociones

Información importante

Todo lo demás debe obtenerse mediante herramientas.

---

# Herramientas

La IA debe utilizar herramientas.

Ejemplos:

buscarProducto()

buscarCliente()

buscarStock()

buscarHorario()

crearPedido()

crearTurno()

guardarMemoria()

buscarMemoria()

buscarPromociones()

Cada herramienta debe ser completamente independiente.

---

# Memoria

Guardar únicamente información útil.

Ejemplos:

Nombre

Preferencias

Última compra

Conversaciones importantes

No guardar información sensible innecesaria.

---

# WhatsApp

Utilizar únicamente la API oficial de Meta.

No utilizar soluciones no oficiales.

Soportar:

Texto

Audio

Imagen

Video

Documentos

Plantillas

Botones

Estados

Embedded Signup

---

# Panel

El Dashboard debe permitir:

Administrar empresas

Administrar usuarios

Administrar conversaciones

Administrar IA

Administrar productos

Administrar servicios

Administrar FAQ

Administrar clientes

Visualizar estadísticas

Administrar planes

Administrar pagos

Administrar integraciones

---

# Planes

Starter

Pro

Business

Enterprise

Cada plan debe ser configurable.

No hardcodear límites.

---

# Base de datos

Diseñar completamente PostgreSQL.

Utilizar migraciones.

Normalizar correctamente.

Crear índices.

Utilizar UUID.

Registrar timestamps.

Registrar soft delete cuando corresponda.

---

# Seguridad

Aplicar:

JWT

Supabase Auth

Roles

Permisos

Rate Limiting

Logs

Backups

Auditoría

Nunca confiar en datos provenientes del cliente.

---

# Calidad

Todo el código debe cumplir:

Clean Code

SOLID

Arquitectura limpia

Código documentado

Testing

Tipado estricto

Sin duplicación

Sin archivos gigantes.

---

# Testing

Todo módulo importante debe tener pruebas.

Unitarias.

Integración.

---

# Performance

Optimizar siempre.

Evitar consultas innecesarias.

Implementar cache cuando sea necesario.

Implementar colas para procesos pesados.

---

# Escalabilidad

Preparar el sistema para:

1000 empresas.

100000 conversaciones diarias.

Millones de mensajes.

Nunca asumir un único servidor.

---

# Documentación

Antes de implementar una funcionalidad nueva:

1.

Explicar el diseño.

2.

Explicar ventajas.

3.

Explicar desventajas.

4.

Explicar alternativas.

Luego comenzar la implementación.

---

# Forma de trabajar

No generar miles de líneas de código sin planificación.

Siempre dividir el trabajo en tareas pequeñas.

Al finalizar cada tarea:

- actualizar documentación

- actualizar roadmap

- explicar qué falta

- proponer mejoras

---

# Roadmap inicial

Fase 1

- Arquitectura
- Base de datos
- Autenticación
- Empresas

Fase 2

- WhatsApp
- IA
- Conversaciones

Fase 3

- Productos
- Servicios
- Dashboard

Fase 4

- Pagos
- Suscripciones
- Analytics

Fase 5

- Instagram
- Telegram
- Email
- Marketplace

---

# Regla más importante

No escribir código únicamente para que funcione.

Escribir código para que dentro de cinco años siga siendo mantenible.

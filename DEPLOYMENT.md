# Despliegue a producción

Backend y frontend se despliegan en **Render** mediante `render.yaml`; la base
de datos es **Postgres en Supabase**. Este documento cubre el orden de los
pasos y las decisiones que no son evidentes desde el código.

---

## 1. Requisito previo: el dominio

Para que la sesión funcione, el navegador tiene que enviar la cookie de
autenticación desde el frontend hacia la API. Eso depende de si ambos comparten
*sitio registrable*:

| Topología | Cookie | ¿Funciona? |
|---|---|---|
| `app.tudominio.com` + `api.tudominio.com` | `AUTH_COOKIE_SAMESITE=lax` | Sí, recomendado |
| `saasbot-web.onrender.com` + `saasbot-api.onrender.com` | `AUTH_COOKIE_SAMESITE=none` | Sí, pero más expuesto a CSRF |

`onrender.com` figura en la [Public Suffix List](https://publicsuffix.org/), así
que **dos subdominios suyos ya cuentan como sitios distintos**: sin dominio
propio hay que usar `none`.

Con dominio propio, en Render se agregan como *custom domains* del servicio
correspondiente y se apuntan los registros DNS que indique el panel.

---

## 2. Base de datos en Supabase

1. En el proyecto de Supabase: **Project Settings → Database → Connection string**.
2. Copiar la cadena del **Connection pooler** (puerto `6543`), no la directa.
   Render escala a varias instancias y cada una abre su propio pool; por el
   puerto directo se agota enseguida el límite de conexiones de Supabase.
3. Ese valor va en `DATABASE_URL`.

Las migraciones **no** se aplican a mano: `preDeployCommand` ejecuta
`pnpm --filter backend migrate:prod` una vez por despliegue, antes de levantar
las instancias nuevas. Están protegidas por un *advisory lock* de Postgres, así
que dos despliegues simultáneos no se pisan.

> El plan **Free** de Render no admite `preDeployCommand` y además suspende el
> servicio por inactividad, lo que haría perder notificaciones de pago. Por eso
> el blueprint usa el plan `starter`.

---

## 3. Crear los servicios en Render

1. **New → Blueprint**, apuntando al repositorio: Render lee `render.yaml` y
   crea `saasbot-api` y `saasbot-web`.
2. Render pedirá los valores marcados como `sync: false`. Ver la tabla de abajo.
3. `JWT_SECRET` se genera solo (`generateValue: true`); no hace falta inventarlo.

### Variables a completar

| Variable | Servicio | Valor |
|---|---|---|
| `DATABASE_URL` | api | Cadena del pooler de Supabase (paso 2) |
| `WEB_ORIGIN` | api | Origen exacto del frontend, p. ej. `https://app.tudominio.com` (sin barra final) |
| `OPENAI_API_KEY` | api | Clave de OpenAI |
| `WHATSAPP_VERIFY_TOKEN` | api | El que se configure en el panel de Meta |
| `WHATSAPP_ACCESS_TOKEN` | api | Token permanente de la app de Meta |
| `WHATSAPP_APP_SECRET` | api | Para validar la firma de los webhooks de Meta |
| `MERCADOPAGO_ACCESS_TOKEN` | api | **Credenciales de producción** (paso 4) |
| `MERCADOPAGO_WEBHOOK_SECRET` | api | Clave de firma del webhook (paso 4) |
| `MERCADOPAGO_BACK_URL` | api | `https://app.tudominio.com/dashboard/plan` |
| `NEXT_PUBLIC_API_URL` | web | `https://api.tudominio.com` |

`AUTH_COOKIE_SAMESITE` viene en `lax`; cambiarlo a `none` solo si frontend y API
quedan en dominios distintos (paso 1).

> `NEXT_PUBLIC_API_URL` se incrusta en el bundle **durante el build**: si se
> cambia, hay que volver a desplegar el frontend, no alcanza con reiniciarlo.

---

## 4. Mercado Pago en producción

1. En **Tus integraciones → tu aplicación → Credenciales de producción**, copiar
   el *Access Token* (`APP_USR-...`). Las credenciales de prueba no mueven dinero real.
2. En la pestaña **Webhooks** de esa misma aplicación:
   - URL: `https://api.tudominio.com/webhooks/mercadopago`
   - Eventos: **Suscripciones** y **Pagos de suscripción**
   - Copiar la **clave secreta** que se muestra al guardar → `MERCADOPAGO_WEBHOOK_SECRET`
3. Verificar los precios de los planes. Están sembrados en la migración
   `0010_create_plans_table.sql` (Pro $15.000, Business $45.000 ARS). Cambiarlos
   después de tener clientes exige una migración adicional, no editar esa.

La aplicación **se niega a arrancar** si hay `MERCADOPAGO_ACCESS_TOKEN` sin
`MERCADOPAGO_WEBHOOK_SECRET`: sin la clave no se puede distinguir una
notificación real de una falsificada, y cualquiera podría activarse una
suscripción con un POST.

---

## 5. Verificación post-despliegue

```bash
# 1. La API responde y alcanza la base
curl https://api.tudominio.com/health          # {"status":"ok"}

# 2. El catálogo de planes es público
curl https://api.tudominio.com/plans

# 3. El rate limiting está activo
curl -D - -o /dev/null https://api.tudominio.com/plans | grep -i ratelimit

# 4. El webhook rechaza notificaciones sin firma válida
curl -X POST https://api.tudominio.com/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -d '{"type":"preapproval","data":{"id":"falso"}}'        # 401
```

Después, desde el navegador: registrarse, iniciar sesión, **recargar la página**
(esto confirma que la cookie viaja bien; es lo que rompe si `SAMESITE` está mal)
y contratar un plan pago con una tarjeta real.

---

## Limitaciones conocidas

- **Rate limiting en memoria.** Cada instancia lleva su propia cuenta, así que
  con `N` instancias el límite real es `N × RATE_LIMIT_*_MAX`. Para el objetivo
  de miles de empresas hay que moverlo a un store de Redis; los helpers de
  `presentation/middlewares/rateLimit.ts` no cambian de firma al hacerlo.
- **Cobros recurrentes sin verificar contra tráfico real.** El manejo del topic
  `subscription_authorized_payment` está cubierto por tests con dobles, pero el
  primer cargo recurrente real ocurre recién un mes después de la primera alta.
  Conviene revisar los logs y `GET /subscriptions/me/payments` cuando ocurra.
- **Sin backups automatizados propios.** Se depende de los de Supabase; conviene
  confirmar la retención del plan contratado.

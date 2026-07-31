"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let initialized = false;

/**
 * Sin NEXT_PUBLIC_POSTHOG_KEY, posthog-js nunca se inicializa y todas las
 * llamadas de este módulo son no-ops — mismo criterio de degradación que el
 * resto de las integraciones opcionales (OpenAI, Mercado Pago, PostHog en
 * el backend).
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (initialized || !POSTHOG_KEY) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      autocapture: true,
    });
    initialized = true;
  }, []);

  return children;
}

export function identifyBusiness(businessId: string, properties?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  posthog.identify(businessId, properties);
}

export function resetIdentity(): void {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}

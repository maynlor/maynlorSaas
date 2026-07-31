import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { PostHogProvider } from "@/lib/posthog";
import "./globals.css";

// `next/font` autoaloja la fuente: no hay request a Google en runtime, así que
// no hay parpadeo de texto ni una dependencia externa para que cargue la página.
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexo · Asistentes de IA para tu negocio",
  description:
    "Conectá tu WhatsApp y dejá que un asistente con IA atienda a tus clientes las 24 horas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={sans.variable}>
      <body className="font-sans">
        <PostHogProvider>
          <AuthProvider>{children}</AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { PostHogProvider } from "@/lib/posthog";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Business Platform",
  description: "Panel de administración de tu asistente inteligente",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <PostHogProvider>
          <AuthProvider>{children}</AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}

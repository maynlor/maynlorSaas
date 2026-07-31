import type { Config } from "tailwindcss";

/**
 * Paleta violeta / azul / negro sobre fondo oscuro.
 *
 * El negro es azulado (matiz 230) y no gris neutro: sobre un fondo frío, los
 * grises neutros y las sombras neutras se ven sucios al lado del violeta.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(230 35% 5%)",
        surface: "hsl(230 28% 8%)",
        "surface-raised": "hsl(230 24% 11%)",
        border: "hsl(230 20% 18%)",
        "border-strong": "hsl(230 18% 26%)",

        foreground: "hsl(220 30% 97%)",
        muted: "hsl(230 24% 11%)",
        // ~7:1 sobre el fondo: cumple AA con margen. No aclarar menos que esto,
        // que es el error clásico que vuelve ilegible el texto secundario.
        "muted-foreground": "hsl(225 16% 72%)",

        primary: "hsl(262 83% 62%)",
        "primary-foreground": "hsl(0 0% 100%)",
        "primary-muted": "hsl(262 55% 20%)",

        accent: "hsl(217 91% 60%)",
        "accent-foreground": "hsl(0 0% 100%)",

        success: "hsl(160 70% 45%)",
        warning: "hsl(38 92% 55%)",
        destructive: "hsl(0 80% 65%)",
        "destructive-foreground": "hsl(0 0% 100%)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, hsl(262 83% 62%), hsl(217 91% 60%))",
      },
      boxShadow: {
        card: "0 1px 2px hsl(230 40% 2% / 0.6), 0 8px 24px -12px hsl(230 40% 2% / 0.8)",
        glow: "0 0 0 1px hsl(262 83% 62% / 0.25), 0 8px 32px -8px hsl(262 83% 62% / 0.35)",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 320ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;

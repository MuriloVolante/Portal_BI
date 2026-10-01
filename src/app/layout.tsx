import type { Metadata, Viewport } from "next";
import { Inter_Tight, Sora } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const display = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

const body = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Portal BI",
  description: "Portal de dashboards Power BI com controle de acesso",
  appleWebApp: {
    capable: true,
    title: "Portal BI",
    // "black" em vez de "black-translucent": o translúcido desenha a página
    // por baixo da barra de status do iPhone e cobriria o conteúdo do topo.
    statusBarStyle: "black",
  },
  // Declarar `icons` aqui desliga a detecção automática do app/icon.svg,
  // então o favicon precisa estar listado junto.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2D2D2D",
  // Necessário para env(safe-area-inset-bottom) nas barras inferiores do iPhone.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={cn("min-h-screen", display.variable, body.variable)}>
        {children}
      </body>
    </html>
  );
}

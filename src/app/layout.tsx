import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Portal BI",
  description: "Portal de dashboards Power BI com controle de acesso",
  appleWebApp: {
    capable: true,
    title: "Portal BI",
    // "black" em vez de "black-translucent": o translúcido desenha a página
    // por baixo da barra de status do iPhone e cobriria o botão do menu.
    statusBarStyle: "black",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={cn("min-h-screen font-sans", inter.variable, inter.className)}>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Portal BI",
  description: "Portal de dashboards Power BI com controle de acesso",
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

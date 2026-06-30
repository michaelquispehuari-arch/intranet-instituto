import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { fraunces, hanken, plexMono } from "./fonts";

export const metadata: Metadata = {
  title: "Intranet PeRTS",
  description: "Plataforma interna educativa del Seminario Teológico de Remanentes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${fraunces.variable} ${hanken.variable} ${plexMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

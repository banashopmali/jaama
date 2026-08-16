import React from "react";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JAAMA — Operating System de Gestion d'Entreprise pour PME Africaines",
  description:
    "JAAMA est la plateforme SaaS tout-en-un de gestion d'entreprise : facturation, ventes, stocks, paiements Mobile Money (Wave, Orange, MTN), e-commerce et assistant IA.",
  keywords: [
    "JAAMA",
    "SaaS Afrique",
    "Business OS",
    "Facturation PME",
    "Gestion de stock Afrique",
    "Wave Mobile Money",
    "Orange Money",
    "Paiement Mobile Money",
    "E-commerce Afrique",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`scroll-smooth ${plusJakartaSans.variable}`}>
      <body className="antialiased font-sans bg-slate-50 text-slate-900 selection:bg-[#002B9A] selection:text-white">
        {children}
      </body>
    </html>
  );
}

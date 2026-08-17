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
  title: "JAAMA — Web Application Foundation",
  description: "Plateforme SaaS de gestion d'entreprise pour les PME africaines",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`scroll-smooth ${plusJakartaSans.variable}`}>
      <body className="antialiased font-sans bg-slate-50 text-slate-900 selection:bg-[#002B9A] selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}

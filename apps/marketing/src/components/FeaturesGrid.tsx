"use client";

import React from "react";
import { FileText, Package, ShoppingCart, Users, CreditCard, BarChart3, Bot, Smartphone } from "lucide-react";

export function FeaturesGrid() {
  const features = [
    {
      icon: FileText,
      title: "Facturation",
      description: "Créez des factures professionnelles et devis en quelques secondes.",
    },
    {
      icon: Package,
      title: "Stocks",
      description: "Gérez votre inventaire et suivez vos mouvements en temps réel.",
    },
    {
      icon: ShoppingCart,
      title: "Boutique en ligne",
      description: "Créez votre boutique et vendez vos produits en ligne facilement.",
    },
    {
      icon: Users,
      title: "Clients",
      description: "Gérez vos fichiers clients et améliorez la relation commerciale.",
    },
    {
      icon: CreditCard,
      title: "Paiements",
      description: "Acceptez les paiements mobiles (Wave, Orange, MTN), carte et virement.",
    },
    {
      icon: BarChart3,
      title: "Rapports",
      description: "Analysez votre activité commerciale avec des rapports détaillés.",
    },
    {
      icon: Bot,
      title: "Intelligence artificielle",
      description: "Laissez l'assistant JAAMA AI automatiser vos tâches quotidiennes.",
    },
    {
      icon: Smartphone,
      title: "Mobile",
      description: "Gérez votre entreprise partout depuis votre smartphone.",
    },
  ];

  return (
    <section id="fonctionnalites" className="py-20 bg-slate-50/50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[#002B9A] bg-[#F0F4FF] px-3 py-1 rounded-full border border-[#C7D7FE]">
            FONCTIONNALITÉS
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Tout ce dont votre entreprise a besoin.
          </h2>
          <p className="mt-2 text-sm text-slate-600 font-medium">
            Ne jonglez plus entre plusieurs logiciels incompatibles.
          </p>
        </div>

        {/* 8 Clean Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => {
            const IconComp = f.icon;
            return (
              <div
                key={i}
                className="bg-white rounded-xl p-6 border border-slate-200 shadow-card hover:shadow-card-hover hover:border-[#002B9A]/40 transition-all text-left flex flex-col group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#F0F4FF] text-[#002B9A] border border-[#C7D7FE] flex items-center justify-center mb-4 group-hover:bg-[#002B9A] group-hover:text-white transition-colors">
                  <IconComp className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2 group-hover:text-[#002B9A] transition-colors">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Gratuit",
      priceMonthly: "0",
      priceAnnual: "0",
      description: "Pour tester et démarrer une petite activité.",
      features: [
        "Jusqu'à 20 factures / mois",
        "Gestion basique des stocks",
        "1 utilisateur",
        "Support par email",
      ],
      cta: "Essayer gratuitement",
      popular: false,
    },
    {
      name: "Starter",
      priceMonthly: "9 900",
      priceAnnual: "7 900",
      description: "Pour les commerçants et petites entreprises.",
      features: [
        "Factures et devis illimités",
        "Gestion avancée des stocks",
        "Paiements Mobile Money",
        "Jusqu'à 3 utilisateurs",
        "Support prioritaire",
      ],
      cta: "Démarrer avec Starter",
      popular: false,
    },
    {
      name: "Pro",
      priceMonthly: "24 900",
      priceAnnual: "19 900",
      description: "Pour les PME en pleine croissance.",
      features: [
        "Toutes les fonctions Starter",
        "Boutique en ligne intégrée",
        "Assistant JAAMA AI inclus",
        "Jusqu'à 10 utilisateurs",
        "Rapports financiers détaillés",
        "Support dédié 7j/7",
      ],
      cta: "Choisir le plan Pro",
      popular: true,
    },
    {
      name: "Business",
      priceMonthly: "49 900",
      priceAnnual: "39 900",
      description: "Pour les entreprises et réseaux multi-boutiques.",
      features: [
        "Tout du plan Pro illimité",
        "Multi-boutiques & multi-caisses",
        "API & Intégrations sur-mesure",
        "Utilisateurs illimités",
        "Account Manager dédié",
      ],
      cta: "Contacter l'équipe",
      popular: false,
    },
  ];

  return (
    <section id="tarifs" className="py-20 bg-slate-50/50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#002B9A] bg-[#F0F4FF] px-3 py-1 rounded-full border border-[#C7D7FE]">
            TARIFS CLAIRS ET TRANSPARENTS
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Un tarif adapté à chaque étape de votre croissance
          </h2>
          <p className="mt-2 text-sm text-slate-600 font-medium">
            Sans engagement de durée. Changez ou annulez à tout moment.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="mt-6 inline-flex items-center gap-3 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                !isAnnual ? "bg-[#002B9A] text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                isAnnual ? "bg-[#002B9A] text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Annuel</span>
              <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-extrabold">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((p, i) => {
            const isDark = p.popular;
            return (
              <div
                key={i}
                className={`rounded-xl p-6 flex flex-col justify-between transition-all ${
                  isDark
                    ? "bg-[#0B1936] text-white border-2 border-[#002B9A] shadow-xl relative"
                    : "bg-white text-slate-900 border border-slate-200 shadow-card hover:shadow-card-hover"
                }`}
              >
                {isDark && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#002B9A] text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full border border-blue-400/40">
                    Plus Populaire
                  </div>
                )}

                <div>
                  <h3 className="font-extrabold text-lg mb-1">{p.name}</h3>
                  <p className={`text-xs mb-4 min-h-[32px] ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                    {p.description}
                  </p>

                  <div className="mb-6">
                    <span className="text-3xl font-extrabold">
                      {isAnnual ? p.priceAnnual : p.priceMonthly}
                    </span>
                    <span className={`text-xs font-semibold ml-1 ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                      FCFA / mois
                    </span>
                  </div>

                  <div className="space-y-2.5 mb-6">
                    {p.features.map((f, featureIdx) => (
                      <div key={featureIdx} className="flex items-center gap-2.5 text-xs">
                        <Check className={`w-4 h-4 shrink-0 ${isDark ? "text-cyan-400" : "text-[#002B9A]"}`} />
                        <span className={isDark ? "text-slate-200" : "text-slate-700 font-medium"}>
                          {f}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <a
                  href="#essai"
                  className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all text-center ${
                    isDark
                      ? "bg-[#002B9A] hover:bg-[#00227B] text-white border border-blue-400/30"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {p.cta}
                </a>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

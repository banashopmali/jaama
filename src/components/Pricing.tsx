"use client";

import React, { useState } from "react";
import { Check, Zap, Sparkles, Shield, ArrowRight } from "lucide-react";

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: "Starter (Gratuit)",
      tagline: "Pour démarrer votre activité",
      priceMonthly: "0 FCFA",
      priceAnnual: "0 FCFA",
      subtitle: "Gratuit pour toujours • Zéro carte requise",
      features: [
        "Jusqu'à 50 factures / mois",
        "Gestion d'un (1) magasin / stock",
        "Caisse enregistreuse de base",
        "Paiements Mobile Money (Wave, Orange)",
        "Support par email",
      ],
      popular: false,
      ctaText: "Créer mon compte gratuit",
      ctaVariant: "border-slate-300 text-slate-800 hover:bg-slate-100",
    },
    {
      name: "Pro (Recommandé PME)",
      tagline: "Le standard de gestion des entreprises",
      priceMonthly: "15 000 FCFA",
      priceAnnual: "12 000 FCFA",
      subtitle: "Facturé 144 000 FCFA par an (-20%)",
      features: [
        "Factures & devis ILLIMITÉS",
        "Gestion jusqu'à 3 magasins & stocks",
        "Jusqu'à 5 utilisateurs (Caissiers, Gérant)",
        "Boutique en ligne intégrée offerte",
        "Assistant IA JAAMA (50 requêtes/mois)",
        "Relances automatiques WhatsApp / SMS",
        "Support prioritaire par WhatsApp",
      ],
      popular: true,
      ctaText: "Démarrer l'essai Pro gratuit (14j)",
      ctaVariant: "bg-jaama-600 hover:bg-jaama-700 text-white shadow-lg shadow-jaama-600/30",
    },
    {
      name: "Enterprise Multi-Sites",
      tagline: "Pour les réseaux & grandes structures",
      priceMonthly: "45 000 FCFA",
      priceAnnual: "36 000 FCFA",
      subtitle: "Facturé 432 000 FCFA par an (-20%)",
      features: [
        "Tout ce qui est dans le plan Pro",
        "Magasins & points de vente ILLIMITÉS",
        "Utilisateurs & rôles illimités",
        "Assistant IA Business Illimité",
        "Exports comptables SYSCOHADA sur-mesure",
        "Nom de domaine propre pour la boutique",
        "Account Manager dédié & formation équipe",
      ],
      popular: false,
      ctaText: "Contacter l'équipe commercial",
      ctaVariant: "bg-slate-900 hover:bg-slate-800 text-white",
    },
  ];

  return (
    <section id="tarifs" className="py-20 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-jaama-600 bg-jaama-50 px-3 py-1 rounded-full border border-jaama-200">
            Tarifs Transparents & Sans Surprise
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Des forfaits adaptés à la taille de votre entreprise
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Commencez gratuitement sans carte bancaire, puis évoluez au rythme de votre croissance.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 p-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                !isAnnual ? "bg-jaama-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Facturation Mensuelle
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isAnnual ? "bg-jaama-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Facturation Annuelle</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                -20% Offerts
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((p, idx) => (
            <div
              key={idx}
              className={`bg-white rounded-2xl p-8 border transition-all flex flex-col justify-between relative ${
                p.popular
                  ? "border-jaama-600 ring-2 ring-jaama-600/20 shadow-xl"
                  : "border-slate-200 shadow-xs hover:border-slate-300"
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-jaama-600 text-white text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Le plus populaire</span>
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{p.tagline}</p>

                <div className="mt-6 mb-2 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                    {isAnnual ? p.priceAnnual : p.priceMonthly}
                  </span>
                  {p.priceMonthly !== "0 FCFA" && (
                    <span className="text-xs font-semibold text-slate-500">/ mois</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-medium mb-6">{p.subtitle}</p>

                <div className="pt-6 border-t border-slate-100 space-y-3">
                  {p.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                      <Check className="w-4 h-4 text-jaama-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8">
                <a
                  href="#essai"
                  className={`w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-bold transition-all border ${p.ctaVariant}`}
                >
                  <span>{p.ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

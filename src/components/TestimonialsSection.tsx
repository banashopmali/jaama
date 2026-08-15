"use client";

import React from "react";
import { Star, Quote } from "lucide-react";

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Awa Koné",
      role: "Fondatrice & Gérante",
      company: "Awa Mode Dakar",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
      quote:
        "JAAMA a complètement transformé notre boutique. Nous gérons nos stocks et nos paiements Wave et Orange Money en temps réel sans aucune erreur de caisse.",
    },
    {
      name: "Mamadou Traoré",
      role: "Directeur Général",
      company: "Pharmacie Saint Raphaël Abidjan",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      quote:
        "Le suivi de stock et la facturation automatique nous ont fait gagner un temps précieux. L'assistant JAAMA AI répond à toutes nos questions instantanément.",
    },
    {
      name: "Fatoumata Diarra",
      role: "Responsable Achats",
      company: "Restaurant Le Bon Goût Bamako",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      quote:
        "Simple, ultra-rapide et parfaitement adapté à l'Afrique. Nos serveurs prennent les commandes sur mobile et les factures partent directement sur WhatsApp.",
    },
  ];

  return (
    <section className="py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[#002B9A] bg-[#F0F4FF] px-3 py-1 rounded-full border border-[#C7D7FE]">
            TÉMOIGNAGES
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Ce que disent nos clients
          </h2>
          <p className="mt-2 text-sm text-slate-600 font-medium">
            Découvrez comment JAAMA aide les entreprises africaines au quotidien.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-slate-50/60 rounded-xl p-6 border border-slate-200 shadow-card flex flex-col justify-between"
            >
              <div>
                <div className="flex text-amber-400 gap-1 mb-3">
                  {[...Array(5)].map((_, starIndex) => (
                    <Star key={starIndex} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 font-normal leading-relaxed italic mb-6">
                  "{t.quote}"
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200/80">
                <img
                  src={t.image}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div className="flex flex-col text-left">
                  <span className="font-bold text-xs text-slate-900">{t.name}</span>
                  <span className="text-[11px] text-slate-500 font-medium">{t.role} — <span className="text-[#002B9A] font-semibold">{t.company}</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

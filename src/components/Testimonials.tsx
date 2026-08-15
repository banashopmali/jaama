"use client";

import React from "react";
import { Star, Quote, Building } from "lucide-react";

export function Testimonials() {
  const reviews = [
    {
      quote:
        "Avant JAAMA, nous perdions un temps précieux à faire nos factures et nos relances sur papier. Aujourd'hui, nous envoyons un lien Wave directement par WhatsApp et l'argent arrive directement. C'est le logiciel qu'il manquait aux commerçants africains.",
      author: "Mamadou DIOP",
      role: "Fondateur & Directeur Général",
      company: "Diop Matériaux & Quincaillerie (Dakar, Sénégal)",
      rating: 5,
    },
    {
      quote:
        "La gestion du stock multi-boutiques était un cauchemar avec nos 3 magasins à Abidjan. Avec JAAMA, je sais exactement combien de cartons il me reste à Cocody ou Treichville depuis mon téléphone portable. Un gain d'efficacité incroyable.",
      author: "Aïcha KONE",
      role: "Gérante d'enseigne",
      company: "Kastel Mode & Cosmétiques (Abidjan, Côte d'Ivoire)",
      rating: 5,
    },
    {
      quote:
        "L'assistant IA m'a littéralement sauvé la vie pour détecter des anomalies de caisse et revoir mes prix de vente. Et le fait qu'il fonctionne même quand la connexion Internet coupe à Douala change tout !",
      author: "Paul ETO'O",
      role: "Directeur des Opérations",
      company: "Eto'o Distribution Sarl (Douala, Cameroun)",
      rating: 5,
    },
  ];

  return (
    <section className="py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-jaama-600 bg-jaama-50 px-3 py-1 rounded-full border border-jaama-200">
            Témoignages Clients
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Approuvé par plus de 10 000 PME et commerçants
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Découvrez comment JAAMA transforme le quotidien des entrepreneurs à Dakar, Abidjan, Douala et dans toute l'Afrique.
          </p>
        </div>

        {/* Reviews Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((rev, idx) => (
            <div
              key={idx}
              className="bg-slate-50 rounded-2xl p-8 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-jaama-300 transition-colors"
            >
              <div>
                <div className="flex gap-1 text-amber-400 mb-4">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>

                <Quote className="w-8 h-8 text-jaama-200 mb-3" />

                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "{rev.quote}"
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-200/80">
                <div className="font-bold text-slate-900 text-sm">{rev.author}</div>
                <div className="text-xs text-slate-500 font-medium">{rev.role}</div>
                <div className="text-[11px] font-semibold text-jaama-600 mt-1 flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  <span>{rev.company}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

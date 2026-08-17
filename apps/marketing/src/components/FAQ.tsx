"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "Comment fonctionne JAAMA en cas de coupure Internet (Mode Offline) ?",
      a: "JAAMA intègre un moteur de synchronisation locale. Vous pouvez continuer à saisir des ventes, encaisser au comptoir et émettre des reçus même sans connexion. Dès que la connexion Internet revient, toutes vos données se synchronisent automatiquement avec le serveur cloud sécurisé.",
    },
    {
      q: "Quels sont les modes de paiement Mobile Money pris en charge ?",
      a: "JAAMA supporte nativement les principaux opérateurs d'Afrique de l'Ouest et Centrale : Wave Digital Finance, Orange Money, MTN Mobile Money, Moov Africa Money, ainsi que les cartes bancaires VISA et Mastercard.",
    },
    {
      q: "Mes données d'entreprise et mes chiffres de vente sont-ils en sécurité ?",
      a: "Absolument. Vos données sont chiffrées de bout en bout (AES-256) et hébergées sur des serveurs hautement sécurisés avec sauvegardes quotidiennes. Vous seul et les utilisateurs autorisés de votre équipe avez accès à vos comptes.",
    },
    {
      q: "Puis-je importer facilement mes clients et mes produits depuis Excel ?",
      a: "Oui ! JAAMA propose un outil d'importation automatique en 1 clic au format Excel / CSV. Vous pouvez charger l'ensemble de votre catalogue de produits, prix et fichier clients en quelques secondes.",
    },
    {
      q: "JAAMA est-il accessible depuis mon téléphone portable (Android / iOS) ?",
      a: "Oui, JAAMA est un Business Operating System multi-plateforme. Vous pouvez l'utiliser aussi bien depuis votre ordinateur (Chrome, Safari, Edge) que sur tablette ou téléphone mobile grâce à notre application Web responsive ultra-rapide.",
    },
    {
      q: "Faut-il saisir une carte bancaire pour démarrer l'essai gratuit de 14 jours ?",
      a: "Non ! Aucun moyen de paiement ni carte bancaire n'est requis pour créer votre compte et tester toutes les fonctionnalités Pro pendant 14 jours. Vous ne payez que si vous décidez de continuer.",
    },
  ];

  return (
    <section id="faq" className="py-20 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-jaama-600 bg-jaama-50 px-3 py-1 rounded-full border border-jaama-200">
            Foire Aux Questions
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Toutes vos questions sur JAAMA
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Des réponses claires pour vous aider à franchir le pas en toute sérénité.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs transition-all"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-sm hover:text-jaama-600 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-jaama-600 shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${
                      isOpen ? "rotate-180 text-jaama-600" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

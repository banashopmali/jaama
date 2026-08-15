"use client";

import React, { useState } from "react";
import { ChevronDown, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export function FAQAndCTABanner() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "Est-ce que JAAMA fonctionne sans connexion internet ?",
      a: "Oui ! L'application mobile JAAMA dispose d'un mode hors-ligne complet. Vous pouvez enregistrer des ventes et émettre des reçus sans internet. Dès que la connexion est rétablie, vos données sont synchronisées automatiquement sur le serveur sécurisé.",
    },
    {
      q: "Quels moyens de paiement sont supportés ?",
      a: "JAAMA intègre en natif Wave Mobile Money, Orange Money, MTN Mobile Money, Moov Money, les cartes bancaires (Visa, Mastercard) et les règlements en espèces ou virement bancaire.",
    },
    {
      q: "Puis-je utiliser JAAMA sur plusieurs téléphones ou ordinateurs ?",
      a: "Absolument. Selon votre formule (Starter, Pro ou Business), vous pouvez connecter plusieurs caissiers, vendeurs ou comptables simultanément avec des niveaux d'accès et des permissions personnalisés.",
    },
    {
      q: "Comment se déroule la migration de nos données actuelles ?",
      a: "Notre équipe d'assistance vous accompagne gratuitement dans l'importation de vos fichiers clients, articles et stocks (fichiers Excel ou CSV) en moins de 15 minutes.",
    },
    {
      q: "Y a-t-il un engagement de durée ?",
      a: "Non, aucun engagement. Vous pouvez choisir un abonnement mensuel et l'interrompre ou faire évoluer votre formule à tout moment en un clic.",
    },
  ];

  return (
    <section className="py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        
        {/* FAQ Section */}
        <div id="faq" className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#002B9A] bg-[#F0F4FF] px-3 py-1 rounded-full border border-[#C7D7FE]">
              FOIRE AUX QUESTIONS
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight">
              Questions fréquemment posées
            </h2>
            <p className="mt-2 text-sm text-slate-600 font-medium">
              Tout ce que vous devez savoir avant de commencer avec JAAMA.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <div
                  key={i}
                  className="bg-slate-50/60 rounded-xl border border-slate-200 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full px-6 py-4 text-left font-bold text-sm text-slate-900 flex justify-between items-center gap-4 hover:bg-slate-100/60 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#002B9A] shrink-0 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="bg-[#0B1936] rounded-2xl p-8 sm:p-12 text-white border border-blue-900/50 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#002B9A] border border-blue-400/30 text-xs font-semibold text-cyan-300">
                <Zap className="w-3.5 h-3.5" />
                <span>Prêt à passer à la vitesse supérieure ?</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Rejoignez 50 000+ entreprises qui font confiance à JAAMA.
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-normal leading-relaxed">
                Démarrez votre essai gratuit de 14 jours dès aujourd'hui. Aucune carte bancaire requise. Configuration en 2 minutes.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <a
                  href="#essai"
                  className="inline-flex items-center justify-center gap-2 bg-[#002B9A] hover:bg-[#00227B] text-white font-semibold text-sm px-6 py-3.5 rounded-lg border border-blue-400/40 shadow-lg transition-colors text-center"
                >
                  <span>Créer mon compte gratuitement</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Visual element */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
                  alt="Entrepreneure JAAMA"
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl object-cover border-4 border-slate-700/60 shadow-2xl"
                />
                <div className="absolute -bottom-3 -right-3 bg-white text-slate-900 px-3.5 py-2 rounded-xl font-extrabold text-xs shadow-xl flex items-center gap-2 border border-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Support 7j/7</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}

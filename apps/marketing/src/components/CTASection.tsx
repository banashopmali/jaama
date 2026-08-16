"use client";

import React, { useState } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export function CTASection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <section id="essai" className="py-20 bg-slate-950 text-white relative overflow-hidden">
      
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-full pointer-events-none opacity-30">
        <div className="absolute top-10 left-10 w-96 h-96 bg-jaama-600 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-jaama-900 border border-jaama-700 text-jaama-300 text-xs font-bold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-jaama-400" />
          <span>Inscription Rapide en 30 Secondes</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-3xl mx-auto">
          Prêt à faire passer votre entreprise au niveau supérieur ?
        </h2>

        <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal">
          Rejoignez plus de <strong className="text-white">10 000 PME et commerçants</strong> qui simplifient leur facturation, leurs ventes et la gestion de leur stock au quotidien.
        </p>

        {/* Quick Signup Box */}
        <div className="mt-8 max-w-md mx-auto">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Entrez votre email professionnel..."
                className="w-full px-4 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-jaama-500 focus:ring-1 focus:ring-jaama-500"
              />
              <button
                type="submit"
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 bg-jaama-600 hover:bg-jaama-500 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-lg shadow-jaama-600/30 transition-all"
              >
                <span>Démarrer gratuit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Félicitations ! Votre accès d'essai 14 jours a été généré avec succès.</span>
            </div>
          )}
        </div>

        {/* Guarantees */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-semibold">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-jaama-400" />
            14 jours d'essai offerts
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-jaama-400" />
            Aucune carte bancaire demandée
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-jaama-400" />
            Assistance WhatsApp 7j/7
          </span>
        </div>

      </div>
    </section>
  );
}

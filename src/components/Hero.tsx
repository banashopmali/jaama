"use client";

import React from "react";
import { ArrowRight, Play, Star } from "lucide-react";
import heroImg from "@/assets/hero_img.jpeg";

export function Hero() {
  return (
    <section className="pt-12 pb-16 md:pt-16 md:pb-24 bg-white border-b border-slate-200/60 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Value Proposition */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Top Tag Pill */}
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#F0F4FF] border border-[#C7D7FE] text-[#002B9A] text-xs font-semibold">
              La plateforme tout-en-un pour votre entreprise
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Gérez, vendez et <br />
              développez votre <br />
              entreprise.
            </h1>

            {/* Description */}
            <p className="text-base text-slate-600 font-normal leading-relaxed">
              JAAMA est la plateforme tout-en-un qui permet aux entrepreneurs africains de gérer leurs ventes, leurs factures, leurs stocks, leurs paiements et leur boutique en ligne depuis une seule application.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <a
                href="#essai"
                className="inline-flex items-center justify-center gap-2 bg-[#002B9A] hover:bg-[#00227B] text-white font-semibold text-sm px-6 py-3.5 rounded-lg shadow-xs transition-colors text-center"
              >
                <span>Commencer gratuitement</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm px-5 py-3.5 rounded-lg border border-slate-300 shadow-2xs transition-colors text-center"
              >
                <div className="w-5 h-5 rounded-full bg-[#F0F4FF] text-[#002B9A] flex items-center justify-center">
                  <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                </div>
                <span>Voir la démonstration</span>
              </a>
            </div>

            {/* Rating & Social Proof */}
            <div className="pt-4 flex items-center gap-3">
              <div className="flex -space-x-2 overflow-hidden">
                <img
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                  alt="Utilisateur JAAMA 1"
                />
                <img
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"
                  alt="Utilisateur JAAMA 2"
                />
                <img
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80"
                  alt="Utilisateur JAAMA 3"
                />
              </div>

              <div className="flex flex-col">
                <div className="flex text-amber-400 gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <span className="text-xs font-semibold text-slate-700 mt-0.5">
                  50 000+ entreprises nous font confiance
                </span>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Image */}
          <div className="lg:col-span-7 relative">
            <div className="relative mx-auto max-w-2xl lg:max-w-none">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white group">
                <img
                  src={heroImg.src}
                  alt="JAAMA Application Interface"
                  className="w-full h-auto object-cover rounded-2xl transition-transform duration-500 group-hover:scale-[1.01]"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

"use client";

import React from "react";
import { JaamaLogo } from "./Navbar";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-2">
              {/* White background badge for logo visibility */}
              <div className="bg-white px-3.5 py-2 rounded-xl inline-block">
                <JaamaLogo className="h-12" />
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              JAAMA est l'Operating System de gestion d'entreprise tout-en-un conçu pour accélérer la croissance des commerçants et PME africaines.
            </p>
            <div className="text-xs text-slate-500 font-medium">
              Présent à Dakar • Abidjan • Bamako • Ouagadougou
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs">
            
            <div className="space-y-3">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Produit</h4>
              <ul className="space-y-2">
                <li><a href="#fonctionnalites" className="hover:text-white transition-colors">Facturation</a></li>
                <li><a href="#fonctionnalites" className="hover:text-white transition-colors">Gestion des stocks</a></li>
                <li><a href="#fonctionnalites" className="hover:text-white transition-colors">Paiements Mobile Money</a></li>
                <li><a href="#fonctionnalites" className="hover:text-white transition-colors">Boutique en ligne</a></li>
                <li><a href="#fonctionnalites" className="hover:text-white transition-colors">JAAMA AI Assistant</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Entreprise</h4>
              <ul className="space-y-2">
                <li><a href="#apropos" className="hover:text-white transition-colors">À propos</a></li>
                <li><a href="#carrieres" className="hover:text-white transition-colors">Carrières</a></li>
                <li><a href="#presse" className="hover:text-white transition-colors">Presse & Médias</a></li>
                <li><a href="#partenaires" className="hover:text-white transition-colors">Partenaires</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Ressources</h4>
              <ul className="space-y-2">
                <li><a href="#blog" className="hover:text-white transition-colors">Blog & Guides</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">Centre d'aide / FAQ</a></li>
                <li><a href="#api" className="hover:text-white transition-colors">Documentation API</a></li>
                <li><a href="#status" className="hover:text-white transition-colors">Statut du service</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Légal</h4>
              <ul className="space-y-2">
                <li><a href="#confidentialite" className="hover:text-white transition-colors">Confidentialité</a></li>
                <li><a href="#cgu" className="hover:text-white transition-colors">CGU / CGV</a></li>
                <li><a href="#securite" className="hover:text-white transition-colors">Sécurité des données</a></li>
                <li><a href="#mentions" className="hover:text-white transition-colors">Mentions légales</a></li>
              </ul>
            </div>

          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            © {new Date().getFullYear()} JAAMA Inc. Tous droits réservés.
          </div>
          <div className="flex gap-6">
            <a href="#confidentialite" className="hover:text-slate-400">Confidentialité</a>
            <a href="#cgu" className="hover:text-slate-400">Conditions d'utilisation</a>
            <a href="#cookies" className="hover:text-slate-400">Cookies</a>
          </div>
        </div>

      </div>
    </footer>
  );
}

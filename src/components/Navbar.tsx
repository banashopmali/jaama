"use client";

import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import logoImg from "@/assets/jaama_logo.jpeg";

export function JaamaLogo({ className = "h-14" }: { className?: string }) {
  return (
    <img
      src={logoImg.src}
      alt="JAAMA Logo"
      className={`${className} w-auto object-contain`}
    />
  );
}

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <a href="#" className="flex items-center focus:outline-hidden py-1">
            <JaamaLogo className="h-14 sm:h-16" />
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#fonctionnalites"
              className="text-sm font-medium text-slate-700 hover:text-[#002B9A] transition-colors"
            >
              Fonctionnalités
            </a>
            <a
              href="#tarifs"
              className="text-sm font-medium text-slate-700 hover:text-[#002B9A] transition-colors"
            >
              Tarifs
            </a>
            <a
              href="#ressources"
              className="text-sm font-medium text-slate-700 hover:text-[#002B9A] transition-colors"
            >
              Ressources
            </a>
            <a
              href="#apropos"
              className="text-sm font-medium text-slate-700 hover:text-[#002B9A] transition-colors"
            >
              À propos
            </a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="#connexion"
              className="text-sm font-semibold text-slate-700 hover:text-[#002B9A] px-3 py-2 transition-colors"
            >
              Se connecter
            </a>
            <a
              href="#essai"
              className="bg-[#002B9A] hover:bg-[#00227B] text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-xs transition-colors"
            >
              Commencer gratuitement
            </a>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex md:hidden items-center gap-3">
            <a
              href="#essai"
              className="bg-[#002B9A] text-white text-xs font-semibold px-3.5 py-2 rounded-lg"
            >
              Commencer
            </a>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-slate-900 rounded-lg"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <a
            href="#fonctionnalites"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-800 border-b border-slate-100"
          >
            Fonctionnalités
          </a>
          <a
            href="#tarifs"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-800 border-b border-slate-100"
          >
            Tarifs
          </a>
          <a
            href="#ressources"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-800 border-b border-slate-100"
          >
            Ressources
          </a>
          <a
            href="#apropos"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-800 border-b border-slate-100"
          >
            À propos
          </a>
          <div className="pt-2 flex flex-col gap-2">
            <a
              href="#connexion"
              className="w-full text-center py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700"
            >
              Se connecter
            </a>
            <a
              href="#essai"
              className="w-full text-center py-2.5 rounded-lg bg-[#002B9A] text-white text-sm font-semibold"
            >
              Commencer gratuitement
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

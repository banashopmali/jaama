"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, User, LogOut, Settings, HelpCircle } from "lucide-react";
import { shellMockData } from "@/config/shell-mock.data";

export const UserMenuTrigger: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const user = shellMockData.currentUser;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Menu utilisateur pour ${user.firstName} ${user.lastName}`}
        className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      >
        <div className="w-8 h-8 rounded-lg bg-surface-brand-subtle text-content-brand font-bold text-xs flex items-center justify-center border border-border-brand-subtle shrink-0">
          {user.initials}
        </div>
        <div className="hidden lg:flex flex-col text-left">
          <span className="text-xs font-semibold text-content-primary leading-tight">
            {user.firstName}
          </span>
          <span className="text-[10px] text-content-secondary leading-tight">
            {user.role}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-content-muted hidden lg:block" />
      </button>

      {/* User Menu Popover */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Options utilisateur"
          className="absolute right-0 mt-2 w-56 bg-surface-default border border-border-default rounded-xl shadow-elevated p-1.5 z-50 space-y-1"
        >
          <div className="px-3 py-2 border-b border-border-subtle mb-1">
            <p className="text-xs font-bold text-content-primary">{user.firstName} {user.lastName}</p>
            <p className="text-[11px] text-content-secondary truncate">{user.email}</p>
          </div>

          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-content-primary hover:bg-surface-hover transition-colors text-left"
          >
            <User className="w-4 h-4 text-content-secondary" />
            <span>Mon Profil</span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-content-primary hover:bg-surface-hover transition-colors text-left"
          >
            <Settings className="w-4 h-4 text-content-secondary" />
            <span>Paramètres du compte</span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-content-primary hover:bg-surface-hover transition-colors text-left"
          >
            <HelpCircle className="w-4 h-4 text-content-secondary" />
            <span>Support &amp; Aide</span>
          </button>

          <div className="pt-1 mt-1 border-t border-border-subtle">
            <button
              type="button"
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-status-danger text-left hover:bg-status-danger-subtle transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

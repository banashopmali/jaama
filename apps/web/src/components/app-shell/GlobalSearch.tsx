"use client";

import React, { useRef, useEffect } from "react";
import { Search } from "lucide-react";

export const GlobalSearch: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Ctrl+K / Cmd+K focuses global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative flex-1 max-w-md hidden sm:block">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-content-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Rechercher dans JAAMA… (Ctrl+K)"
          aria-label="Rechercher dans JAAMA"
          className="w-full h-10 pl-9 pr-12 text-xs font-medium bg-surface-subtle border border-border-subtle rounded-xl text-content-primary placeholder:text-content-muted transition-colors hover:border-border-default focus:outline-none focus:bg-surface-default focus:border-border-focus focus:ring-2 focus:ring-brand-primary/20"
        />
        <div className="absolute right-2.5 hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border-subtle bg-surface-default text-[10px] font-mono font-medium text-content-muted pointer-events-none">
          <kbd className="font-sans">Ctrl</kbd>
          <span>K</span>
        </div>
      </div>
    </div>
  );
};

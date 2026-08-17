"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export interface JaamaLogoProps {
  variant?: "full" | "compact" | "mobile";
  className?: string;
}

export const JaamaLogo: React.FC<JaamaLogoProps> = ({
  variant = "full",
  className = "",
}) => {
  if (variant === "compact") {
    return (
      <Link
        href="/"
        className={`flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg ${className}`}
        aria-label="Accueil JAAMA"
      >
        <Image
          src="/assets/jaama_logo.jpeg"
          alt="JAAMA"
          width={36}
          height={36}
          className="h-9 w-9 object-contain rounded-lg border border-border-subtle"
        />
      </Link>
    );
  }

  if (variant === "mobile") {
    return (
      <Link
        href="/"
        className={`flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg ${className}`}
        aria-label="Accueil JAAMA"
      >
        <Image
          src="/assets/jaama_logo.jpeg"
          alt="JAAMA"
          width={120}
          height={32}
          priority
          className="h-8 w-auto object-contain rounded-md"
        />
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className={`flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg ${className}`}
      aria-label="Accueil JAAMA"
    >
      <Image
        src="/assets/jaama_logo.jpeg"
        alt="JAAMA"
        width={140}
        height={40}
        priority
        className="h-10 w-auto object-contain rounded-lg"
      />
    </Link>
  );
};

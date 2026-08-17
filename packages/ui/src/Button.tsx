import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}

export function Button({ variant = "primary", children, className = "", ...props }: ButtonProps) {
  const baseStyle = "inline-flex items-center justify-center font-semibold text-sm rounded-lg transition-colors px-5 py-2.5";
  const variants = {
    primary: "bg-[#002B9A] hover:bg-[#00227B] text-white shadow-xs",
    secondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

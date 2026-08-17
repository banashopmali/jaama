import React from "react";
import { cn } from "./utils/cn";
import { Spinner } from "./Spinner";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon: React.ReactNode;
}

const variantClasses = {
  primary:
    "bg-[#002B9A] text-white hover:bg-[#00227B] active:bg-[#001A61] focus-visible:ring-[#002B9A] shadow-sm",
  secondary:
    "bg-[#F0F4FF] text-[#002B9A] hover:bg-[#E0E9FF] active:bg-[#C7D7FE] border border-[#C7D7FE] focus-visible:ring-[#002B9A]",
  outline:
    "bg-transparent text-slate-800 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-[#002B9A]",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-[#002B9A]",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-600 shadow-sm",
};

const sizeClasses = {
  sm: "w-10 h-10 text-sm rounded-md",
  md: "w-11 h-11 text-base rounded-md",
  lg: "w-12 h-12 text-lg rounded-lg",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      "aria-label": ariaLabel,
      variant = "outline",
      size = "md",
      isLoading = false,
      icon,
      disabled,
      className,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center font-sans transition-colors duration-150 ease-in-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none shrink-0",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading ? <Spinner size={size === "sm" ? "sm" : "md"} /> : icon}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

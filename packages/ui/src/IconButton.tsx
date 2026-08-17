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
    "bg-brand-primary text-content-inverse hover:bg-brand-primary-hover active:bg-brand-primary-active focus-visible:ring-brand-primary shadow-sm",
  secondary:
    "bg-surface-brand-subtle text-content-brand hover:bg-surface-brand-subtle-hover active:bg-surface-brand-subtle-active border border-border-brand-subtle focus-visible:ring-brand-primary",
  outline:
    "bg-transparent text-content-primary border border-border-default hover:bg-surface-subtle active:bg-surface-hover focus-visible:ring-brand-primary",
  ghost:
    "bg-transparent text-content-secondary hover:bg-surface-subtle active:bg-surface-hover focus-visible:ring-brand-primary",
  destructive:
    "bg-status-danger text-content-inverse hover:bg-status-danger-text active:bg-status-danger-text focus-visible:ring-status-danger shadow-sm",
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

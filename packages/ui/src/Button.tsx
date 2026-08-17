import React from "react";
import { cn } from "./utils/cn";
import { Spinner } from "./Spinner";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
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
  sm: "h-10 px-4 text-sm font-medium rounded-md gap-2",
  md: "h-11 px-5 text-base font-semibold rounded-md gap-2.5",
  lg: "h-12 px-6 text-base font-semibold rounded-lg gap-3",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
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
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center font-sans transition-colors duration-150 ease-in-out cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading && <Spinner size={size === "sm" ? "sm" : "md"} />}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

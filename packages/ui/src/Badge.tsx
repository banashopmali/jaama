import React from "react";
import { cn } from "./utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "info" | "success" | "warning" | "danger" | "brand";
  size?: "sm" | "md";
}

const variantClasses = {
  neutral: "bg-status-neutral-subtle text-status-neutral-text border-status-neutral-border",
  info: "bg-status-info-subtle text-status-info-text border-status-info-border",
  success: "bg-status-success-subtle text-status-success-text border-status-success-border",
  warning: "bg-status-warning-subtle text-status-warning-text border-status-warning-border",
  danger: "bg-status-danger-subtle text-status-danger-text border-status-danger-border",
  brand: "bg-surface-brand-subtle text-content-brand border-border-brand-subtle",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs font-medium rounded",
  md: "px-2.5 py-1 text-xs font-semibold rounded-md",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "neutral", size = "md", className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center border font-sans select-none shrink-0",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

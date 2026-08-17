import React from "react";
import { cn } from "./utils/cn";

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: "info" | "success" | "warning" | "danger";
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const variantClasses = {
  info: "bg-status-info-subtle border-status-info-border text-status-info-text",
  success: "bg-status-success-subtle border-status-success-border text-status-success-text",
  warning: "bg-status-warning-subtle border-status-warning-border text-status-warning-text",
  danger: "bg-status-danger-subtle border-status-danger-border text-status-danger-text",
};

const defaultIcons = {
  info: (
    <svg className="w-5 h-5 text-status-info shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5 text-status-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-status-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  danger: (
    <svg className="w-5 h-5 text-status-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      variant = "info",
      title,
      icon,
      action,
      className,
      children,
      role = "alert",
      ...props
    },
    ref
  ) => {
    const renderIcon = icon ?? defaultIcons[variant];

    return (
      <div
        ref={ref}
        role={role}
        className={cn(
          "flex items-start p-4 rounded-lg border font-sans gap-3",
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {renderIcon && <div className="mt-0.5">{renderIcon}</div>}
        <div className="flex-1 text-sm leading-5">
          {title && <h5 className="font-semibold text-content-primary mb-1">{title}</h5>}
          <div className="text-content-secondary">{children}</div>
        </div>
        {action && <div className="shrink-0 ml-2">{action}</div>}
      </div>
    );
  }
);

Alert.displayName = "Alert";

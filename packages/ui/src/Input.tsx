import React from "react";
import { cn } from "./utils/cn";
import { Label } from "./Label";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helperText?: string;
  error?: string;
  isInvalid?: boolean;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-10 text-sm px-3",
  md: "h-11 text-base px-3.5",
  lg: "h-12 text-base px-4",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      isInvalid = false,
      leftSlot,
      rightSlot,
      size = "md",
      disabled,
      className,
      id,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const helperId = `${inputId}-helper`;
    const hasError = isInvalid || Boolean(error);

    return (
      <div className="w-full font-sans">
        {label && (
          <Label htmlFor={inputId} required={required}>
            {label}
          </Label>
        )}
        <div className="relative flex items-center w-full">
          {leftSlot && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-content-muted">
              {leftSlot}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={hasError}
            aria-describedby={helperText || error ? helperId : undefined}
            className={cn(
              "w-full font-sans bg-surface-default border text-content-primary rounded-md transition-colors placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-surface-disabled disabled:text-content-disabled disabled:cursor-not-allowed",
              sizeClasses[size],
              leftSlot && "pl-10",
              rightSlot && "pr-10",
              hasError
                ? "border-border-invalid focus:border-border-invalid focus:ring-status-danger-border"
                : "border-border-default focus:border-border-focus focus:ring-brand-primary/20",
              className
            )}
            {...props}
          />
          {rightSlot && (
            <div className="absolute right-3.5 flex items-center text-content-muted">
              {rightSlot}
            </div>
          )}
        </div>
        {(error || helperText) && (
          <p
            id={helperId}
            className={cn(
              "mt-1.5 text-xs font-sans",
              hasError ? "text-status-danger-text font-medium" : "text-content-secondary"
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

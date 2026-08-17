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
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
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
              "w-full font-sans bg-white border text-slate-900 rounded-md transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed",
              sizeClasses[size],
              leftSlot && "pl-10",
              rightSlot && "pr-10",
              hasError
                ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                : "border-slate-300 focus:border-[#002B9A] focus:ring-[#002B9A]/20",
              className
            )}
            {...props}
          />
          {rightSlot && (
            <div className="absolute right-3.5 flex items-center text-slate-400">
              {rightSlot}
            </div>
          )}
        </div>
        {(error || helperText) && (
          <p
            id={helperId}
            className={cn(
              "mt-1.5 text-xs font-sans",
              hasError ? "text-red-600 font-medium" : "text-slate-500"
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

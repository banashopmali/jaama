import React from "react";
import { cn } from "./utils/cn";
import { Label } from "./Label";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  isInvalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      isInvalid = false,
      disabled,
      className,
      id,
      required,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const helperId = `${textareaId}-helper`;
    const hasError = isInvalid || Boolean(error);

    return (
      <div className="w-full font-sans">
        {label && (
          <Label htmlFor={textareaId} required={required}>
            {label}
          </Label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          required={required}
          rows={rows}
          aria-invalid={hasError}
          aria-describedby={helperText || error ? helperId : undefined}
          className={cn(
            "w-full font-sans bg-white border text-slate-900 rounded-md p-3 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed resize-y",
            hasError
              ? "border-red-500 focus:border-red-500 focus:ring-red-200"
              : "border-slate-300 focus:border-[#002B9A] focus:ring-[#002B9A]/20",
            className
          )}
          {...props}
        />
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

Textarea.displayName = "Textarea";

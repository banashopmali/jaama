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
            "w-full font-sans bg-surface-default border text-content-primary rounded-md p-3 transition-colors placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-surface-disabled disabled:text-content-disabled disabled:cursor-not-allowed resize-y",
            hasError
              ? "border-border-invalid focus:border-border-invalid focus:ring-status-danger-border"
              : "border-border-default focus:border-border-focus focus:ring-brand-primary/20",
            className
          )}
          {...props}
        />
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

Textarea.displayName = "Textarea";

import React from "react";
import { cn } from "./utils/cn";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    { label, description, error, disabled, className, id, checked, defaultChecked, onChange, ...props },
    ref
  ) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    return (
      <div className="flex items-start gap-3 font-sans">
        <div className="flex items-center h-5 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            disabled={disabled}
            checked={checked}
            defaultChecked={defaultChecked}
            onChange={onChange}
            className={cn(
              "w-4 h-4 rounded border-border-default text-brand-primary focus:ring-2 focus:ring-brand-primary/30 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors accent-[var(--jaama-color-brand-primary)]",
              error && "border-border-invalid",
              className
            )}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="text-sm leading-5 select-none">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  "font-medium text-content-primary cursor-pointer",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-content-secondary mt-0.5">{description}</p>
            )}
            {error && (
              <p className="text-xs text-status-danger-text font-medium mt-0.5">{error}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

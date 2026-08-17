import React from "react";
import { cn } from "./utils/cn";

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  (
    { label, description, disabled, className, id, checked, defaultChecked, onChange, name, ...props },
    ref
  ) => {
    const generatedId = React.useId();
    const radioId = id || generatedId;

    return (
      <div className="flex items-start gap-3 font-sans">
        <div className="flex items-center h-5 mt-0.5">
          <input
            ref={ref}
            type="radio"
            id={radioId}
            name={name}
            disabled={disabled}
            checked={checked}
            defaultChecked={defaultChecked}
            onChange={onChange}
            className={cn(
              "w-4 h-4 text-[#002B9A] border-slate-300 focus:ring-2 focus:ring-[#002B9A]/30 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors accent-[#002B9A]",
              className
            )}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="text-sm leading-5 select-none">
            {label && (
              <label
                htmlFor={radioId}
                className={cn(
                  "font-medium text-slate-800 cursor-pointer",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Radio.displayName = "Radio";

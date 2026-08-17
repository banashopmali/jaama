import React from "react";
import { cn } from "./utils/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = "rectangular", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse bg-surface-disabled motion-reduce:animate-none",
          variant === "text" && "h-4 w-full rounded",
          variant === "circular" && "rounded-full",
          variant === "rectangular" && "rounded-md",
          className
        )}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

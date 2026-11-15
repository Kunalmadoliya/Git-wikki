import React from "react";
import { cn } from "../../utils/cn";

export function Badge({
  children,
  variant = "neutral",
  size = "sm",
  dot = false,
  className = "",
}) {
  const sizeStyles = {
    sm: "text-[11px] px-2.5 py-0.5 rounded-full font-medium gap-1.5",
    md: "text-xs px-3 py-1 rounded-full font-medium gap-2",
  };

  const variantStyles = {
    primary: "bg-blue-50 text-blue-700 border border-blue-200",
    secondary: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    danger: "bg-rose-50 text-rose-700 border border-rose-200",
    neutral: "bg-slate-100 text-slate-600 border border-slate-200",
  };

  const dotColors = {
    primary: "bg-blue-600",
    secondary: "bg-indigo-600",
    success: "bg-emerald-600",
    warning: "bg-amber-600",
    danger: "bg-rose-600",
    neutral: "bg-slate-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-sans tracking-wide leading-none transition-colors select-none",
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full animate-pulse", dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

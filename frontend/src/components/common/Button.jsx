import React from "react";
import { cn } from "../../utils/cn";
import { Loader2 } from "lucide-react";

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  className = "",
  leftIcon,
  rightIcon,
  type = "button",
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium font-sans transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
    md: "text-sm px-4 py-2.5 rounded-xl gap-2",
    lg: "text-base px-5 py-3 rounded-xl gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 shadow-xs hover:shadow font-semibold",
    secondary:
      "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs font-medium",
    emerald:
      "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs hover:shadow font-semibold",
    ghost:
      "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 shadow-xs",
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

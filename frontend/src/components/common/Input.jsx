import React from "react";
import { cn } from "../../utils/cn";

export function Input({
  label,
  error,
  hint,
  id,
  className = "",
  leftIcon,
  rightIcon,
  disabled,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-bento-12 font-semibold uppercase tracking-wider text-bento-muted"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-bento-light">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          disabled={disabled}
          className={cn(
            "w-full bg-white text-bento-text text-bento-14 rounded-bento border border-bento-border py-2.5 px-3.5 transition-all duration-200 outline-none",
            "placeholder:text-gray-400",
            "hover:border-bento-secondary/60",
            "focus-visible:border-bento-secondary focus-visible:ring-2 focus-visible:ring-bento-secondary/20",
            "disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed",
            leftIcon ? "pl-10" : "",
            rightIcon ? "pr-10" : "",
            error ? "border-bento-danger focus-visible:ring-bento-danger/20" : "",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 flex items-center text-bento-light">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-bento-12 text-bento-danger font-medium flex items-center gap-1">
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="text-bento-12 text-bento-muted">{hint}</p>
      )}
    </div>
  );
}

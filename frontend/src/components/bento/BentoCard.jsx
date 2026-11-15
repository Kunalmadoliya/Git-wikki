import React from "react";
import { cn } from "../../utils/cn";

export function BentoCard({
  children,
  colSpan = 12,
  title,
  subtitle,
  icon,
  badge,
  action,
  className = "",
  headerClassName = "",
  glow = false,
}) {
  const colSpans = {
    3: "col-span-12 lg:col-span-3",
    4: "col-span-12 lg:col-span-4",
    5: "col-span-12 lg:col-span-5",
    6: "col-span-12 lg:col-span-6",
    7: "col-span-12 lg:col-span-7",
    8: "col-span-12 lg:col-span-8",
    9: "col-span-12 lg:col-span-9",
    12: "col-span-12",
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 transition-all duration-300",
        "shadow-xs hover:shadow-md hover:border-slate-300",
        glow && "ring-1 ring-emerald-500/30 border-emerald-300 shadow-emerald-500/5",
        colSpans[colSpan] || "col-span-12",
        className
      )}
    >
      {(title || subtitle || icon || badge || action) && (
        <div className={cn("flex items-start justify-between gap-4 mb-5 pb-4 border-b border-slate-100", headerClassName)}>
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <div className="flex items-center gap-2.5">
                  <h3 className="font-semibold text-slate-900 text-[15px] tracking-tight font-sans">
                    {title}
                  </h3>
                  {badge}
                </div>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 font-normal mt-0.5 font-sans">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div>{children}</div>
    </div>
  );
}

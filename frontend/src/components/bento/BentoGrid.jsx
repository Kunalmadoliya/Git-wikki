import React from "react";
import { cn } from "../../utils/cn";

/**
 * BentoGrid - 12-column responsive grid container for Bento Cards
 * Preserves consistent 16px/24px spacing rhythm
 */
export function BentoGrid({ children, className = "" }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 md:gap-5 lg:gap-6 auto-rows-[minmax(180px,auto)]",
        className
      )}
    >
      {children}
    </div>
  );
}

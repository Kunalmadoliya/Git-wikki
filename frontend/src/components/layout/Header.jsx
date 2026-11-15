import React from "react";
import { Box } from "lucide-react";

export function Header({ systemOnline = false }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-[800px] items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Box className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900">GitWiki</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className={`h-2 w-2 rounded-full ${systemOnline ? "bg-emerald-500" : "bg-slate-300"}`} />
          Engine {systemOnline ? "online" : "offline"}
        </div>
      </div>
    </header>
  );
}

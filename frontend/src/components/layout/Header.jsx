import React from "react";
import { Badge } from "../common/Badge";
import { Github, Box } from "lucide-react";

export function Header({ systemOnline = true, activeRepo = "" }) {
  return (
    <header className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm font-bold">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight font-sans">
                GitWiki
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-semibold">
                BENTO RAG
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans hidden sm:block">
              GitHub Intelligence Engine
            </p>
          </div>
        </div>

        {/* Center Active Repo Chip */}
        {activeRepo && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 shadow-2xs">
            <span className="text-slate-400">Target:</span>
            <span className="text-blue-600 font-semibold truncate max-w-xs">
              {activeRepo.replace("https://github.com/", "")}
            </span>
          </div>
        )}

        {/* Right Badges */}
        <div className="flex items-center gap-3">
          <Badge variant={systemOnline ? "success" : "warning"} dot>
            {systemOnline ? "Engine Online" : "Connecting"}
          </Badge>

          <Badge variant="neutral" className="hidden sm:inline-flex">
            Zero Login
          </Badge>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all shadow-2xs"
            title="GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

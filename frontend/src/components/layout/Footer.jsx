import React from "react";
import { Badge } from "../common/Badge";
import { Box } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white/80 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Box className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-slate-800">GitWiki RAG</span>
          <span>•</span>
          <span>Orchestrated with Inngest, LangChain & Pinecone</span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <Badge variant="neutral">Poppins & JetBrains Mono</Badge>
          <Badge variant="neutral">Symmetric Bento Grid</Badge>
          <Badge variant="neutral">TanStack Query v5</Badge>
        </div>
      </div>
    </footer>
  );
}

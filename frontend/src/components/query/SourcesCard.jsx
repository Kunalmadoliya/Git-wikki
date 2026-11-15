import React, { useState } from "react";
import { BentoCard } from "../bento/BentoCard";
import { Badge } from "../common/Badge";
import {
  FileCode2,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  Code,
} from "lucide-react";

export function SourcesCard({ results = [], repoKey = "" }) {
  const [expandedIndex, setExpandedIndex] = useState(0);

  if (!results || results.length === 0) {
    return (
      <BentoCard
        colSpan={5}
        rowSpan={1}
        icon={<FileCode2 className="w-5 h-5 text-bento-secondary" />}
        title="Retrieved Citations"
        subtitle="Pinecone similarity search documents"
        badge={<Badge variant="neutral">0 Sources</Badge>}
      >
        <div className="flex flex-col items-center justify-center h-48 text-center p-4">
          <Layers className="w-8 h-8 text-bento-light/60 mb-2" />
          <p className="text-bento-14 font-medium text-bento-muted">No sources retrieved yet</p>
          <p className="text-bento-12 text-bento-light max-w-xs mt-1">
            Run a semantic query above to inspect the exact files and code snippets pulled from Pinecone.
          </p>
        </div>
      </BentoCard>
    );
  }

  return (
    <BentoCard
      colSpan={5}
      rowSpan={1}
      icon={<FileCode2 className="w-5 h-5 text-bento-secondary" />}
      title="Retrieved Citations"
      subtitle={`${results.length} contextual code chunks retrieved`}
      badge={<Badge variant="secondary">{results.length} Matches</Badge>}
    >
      <div className="space-y-3">
        {/* Source List */}
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {results.map((hit, index) => {
            const isExpanded = expandedIndex === index;
            // hit.source is e.g. "owner/repo/src/index.js" or "src/index.js"
            const sourcePath = hit.source || `Chunk #${index + 1}`;
            const cleanPath = sourcePath.startsWith(`${repoKey}/`)
              ? sourcePath.replace(`${repoKey}/`, "")
              : sourcePath;

            // Score normalization (Pinecone embed search score)
            const scorePercent = hit.score ? Math.round(hit.score * 100) : null;

            return (
              <div
                key={index}
                className={`rounded-bento-sm border transition-all ${
                  isExpanded
                    ? "bg-white border-bento-secondary shadow-sm ring-1 ring-bento-secondary/20"
                    : "bg-bento-subtle/50 hover:bg-white border-bento-border/70"
                }`}
              >
                {/* Header item */}
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                  className="w-full text-left p-3 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-bento-surface border border-bento-border text-bento-12 font-mono flex items-center justify-center font-bold text-bento-secondary shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-mono text-bento-12 font-semibold text-bento-text truncate">
                      {cleanPath}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {scorePercent !== null && (
                      <Badge variant="success" size="sm">
                        {scorePercent}% match
                      </Badge>
                    )}
                    <ChevronRight
                      className={`w-4 h-4 text-bento-light transition-transform ${
                        isExpanded ? "rotate-90 text-bento-secondary" : ""
                      }`}
                    />
                  </div>
                </button>

                {/* Expanded Chunk Details */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-bento-border/40 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-bento-muted font-mono">
                      <span>Exact vector content:</span>
                      <span>Length: {hit.content?.length || 0} chars</span>
                    </div>
                    <pre className="p-2.5 rounded-lg bg-[#1a202c] text-gray-200 text-bento-12 font-mono max-h-48 overflow-y-auto leading-normal whitespace-pre-wrap">
                      <code>{hit.content}</code>
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </BentoCard>
  );
}

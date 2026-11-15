import React, { useState } from "react";
import { BentoCard } from "../bento/BentoCard";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import { useMutation } from "@tanstack/react-query";
import { queryRepository } from "../../services/api";
import {
  Search,
  Sliders,
  Send,
  Zap,
  HelpCircle,
  Code2,
  Cpu,
  Layers,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export function QueryRepoCard({
  targetRepo,
  onQueryResult,
}) {
  const [queryText, setQueryText] = useState("");
  const [topK, setTopK] = useState(5);
  const [queryTime, setQueryTime] = useState(null);

  const queryMutation = useMutation({
    mutationFn: async (payload) => {
      const startTime = performance.now();
      const res = await queryRepository(payload);
      const elapsed = Math.round(performance.now() - startTime);
      return { ...res, executionTimeMs: elapsed };
    },
    onSuccess: (data) => {
      setQueryTime(data.executionTimeMs);
      if (onQueryResult) {
        onQueryResult(data);
      }
    },
  });

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!queryText.trim() || !targetRepo) return;

    queryMutation.mutate({
      repoUrl: targetRepo,
      query: queryText.trim(),
      topK: Number(topK),
    });
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleSubmit();
    }
  };

  const promptSuggestions = [
    { label: "Architecture Overview", prompt: "Explain the overall repository architecture and how modules interact." },
    { label: "Document Chunking", prompt: "How does the chunking algorithm split files and prepare them for Pinecone?" },
    { label: "API Endpoints", prompt: "What API endpoints are implemented and what parameters do they accept?" },
    { label: "Error Handling", prompt: "Where and how are validation errors and exceptions handled?" },
  ];

  return (
    <BentoCard
      colSpan={7}
      rowSpan={1}
      icon={<Search className="w-5 h-5 text-bento-secondary" />}
      title="Semantic Codebase Search & Q&A"
      subtitle={`Target: ${targetRepo.replace("https://github.com/", "")}`}
      badge={<Badge variant="secondary">GPT-4o-mini + Pinecone</Badge>}
      className="border-bento-secondary/30"
    >
      <form onSubmit={handleSubmit} className="flex flex-col justify-between h-full space-y-4">
        {/* Text Area */}
        <div className="space-y-2">
          <div className="relative">
            <textarea
              rows={3}
              placeholder="Ask anything about the codebase (e.g. 'How does similarity search work?' or 'Explain the Inngest background functions')..."
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={queryMutation.isPending}
              className="w-full bg-white text-bento-text text-bento-14 rounded-bento border border-bento-border p-3.5 transition-all outline-none resize-none placeholder:text-gray-400 hover:border-bento-secondary/60 focus-visible:border-bento-secondary focus-visible:ring-2 focus-visible:ring-bento-secondary/20 shadow-inner"
            />
            <div className="absolute right-3 bottom-3 text-bento-12 text-bento-light pointer-events-none hidden sm:block">
              <kbd className="px-1.5 py-0.5 rounded bg-bento-surface border border-bento-border font-mono text-[11px]">
                Ctrl + Enter
              </kbd>
            </div>
          </div>

          {/* Quick Suggestions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-bento-12 font-medium text-bento-muted flex items-center gap-1">
              <Zap className="w-3 h-3 text-bento-warning" /> Suggestions:
            </span>
            {promptSuggestions.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setQueryText(item.prompt)}
                className="text-bento-12 px-2.5 py-1 rounded-full bg-bento-subtle hover:bg-bento-primary/30 border border-bento-border text-bento-text transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top-K Slider & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-bento-sm bg-bento-subtle/50 border border-bento-border/50">
          <div className="flex items-center gap-3">
            <Sliders className="w-4 h-4 text-bento-secondary" />
            <div className="flex items-center gap-2">
              <label htmlFor="topK-slider" className="text-bento-12 font-semibold text-bento-text">
                Top-K Chunks:
              </label>
              <span className="font-mono font-bold text-bento-14 text-bento-secondary bg-white px-2 py-0.5 rounded border border-bento-border">
                {topK}
              </span>
            </div>
            <input
              id="topK-slider"
              type="range"
              min="1"
              max="20"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-24 sm:w-32 accent-[#80A1C1] cursor-pointer"
            />
          </div>

          {queryTime && (
            <span className="text-bento-12 text-bento-muted font-mono">
              Last latency: {queryTime}ms
            </span>
          )}
        </div>

        {/* Error notification */}
        {queryMutation.isError && (
          <div className="flex items-start gap-2 p-3 rounded-bento-sm bg-red-50 border border-red-200 text-bento-danger text-bento-12">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{queryMutation.error.message}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2 border-t border-bento-border/40">
          <span className="text-bento-12 text-bento-muted truncate max-w-[200px] sm:max-w-none">
            Embeddings generated server-side by Pinecone
          </span>
          <Button
            type="submit"
            variant="secondary"
            isLoading={queryMutation.isPending}
            disabled={!queryText.trim()}
            rightIcon={<Send className="w-4 h-4" />}
          >
            {queryMutation.isPending ? "Synthesizing Answer..." : "Ask Question"}
          </Button>
        </div>
      </form>
    </BentoCard>
  );
}

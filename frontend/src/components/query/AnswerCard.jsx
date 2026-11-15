import React, { useState } from "react";
import { BentoCard } from "../bento/BentoCard";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import {
  Sparkles,
  Copy,
  Check,
  Bot,
  Terminal,
  ExternalLink,
  MessageSquare,
} from "lucide-react";

/**
 * Renders formatted answer text with markdown-like styling (code blocks, bullet points, headers)
 */
function MarkdownRenderer({ content }) {
  if (!content) return null;

  // Split content by code blocks ```code```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-bento-14 text-bento-text leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          // Extract language if specified: ```javascript ... ```
          const firstLineBreak = part.indexOf("\n");
          const lang = firstLineBreak !== -1 ? part.slice(3, firstLineBreak).trim() : "";
          const code = firstLineBreak !== -1 ? part.slice(firstLineBreak + 1, -3) : part.slice(3, -3);

          return (
            <div key={index} className="my-3 rounded-bento-sm overflow-hidden border border-gray-800 bg-[#1e2430]">
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#171c26] text-[11px] font-mono text-gray-400 border-b border-gray-800">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-bento-secondary" />
                  {lang || "code"}
                </span>
                <span>JetBrains Mono</span>
              </div>
              <pre className="p-3.5 overflow-x-auto text-bento-12 font-mono text-gray-200 leading-normal">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Standard text lines with headers, bold, bullet points
        const lines = part.split("\n");
        return (
          <div key={index} className="space-y-2">
            {lines.map((line, lIndex) => {
              const trimmed = line.trim();
              if (!trimmed) return null;

              // Headers
              if (trimmed.startsWith("### ")) {
                return (
                  <h4 key={lIndex} className="text-bento-16 font-bold text-bento-text mt-3 pt-1">
                    {trimmed.replace("### ", "")}
                  </h4>
                );
              }
              if (trimmed.startsWith("## ")) {
                return (
                  <h3 key={lIndex} className="text-bento-20 font-bold text-bento-text mt-4 pt-2 border-b border-bento-border/50 pb-1">
                    {trimmed.replace("## ", "")}
                  </h3>
                );
              }
              if (trimmed.startsWith("# ")) {
                return (
                  <h2 key={lIndex} className="text-bento-24 font-bold text-bento-text mt-4">
                    {trimmed.replace("# ", "")}
                  </h2>
                );
              }

              // Bullet points
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                const bulletContent = trimmed.substring(2);
                return (
                  <div key={lIndex} className="flex items-start gap-2 pl-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-bento-secondary mt-2 shrink-0" />
                    <span>{parseInlineFormatting(bulletContent)}</span>
                  </div>
                );
              }

              // Numbered list
              const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
              if (numMatch) {
                return (
                  <div key={lIndex} className="flex items-start gap-2 pl-2">
                    <span className="font-mono font-semibold text-bento-secondary text-bento-12 mt-0.5 shrink-0">
                      {numMatch[1]}.
                    </span>
                    <span>{parseInlineFormatting(numMatch[2])}</span>
                  </div>
                );
              }

              return (
                <p key={lIndex} className="text-bento-14 text-bento-text">
                  {parseInlineFormatting(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Helper to parse bold **text** and inline `code`
 */
function parseInlineFormatting(text) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-bento-surface border border-bento-border font-mono text-bento-12 text-[#2D4F70]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-bento-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export function AnswerCard({ queryResult, onReset }) {
  const [copied, setCopied] = useState(false);

  if (!queryResult) return null;

  const { answer, query, repoKey, topK, results = [], executionTimeMs } = queryResult;

  const handleCopy = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <BentoCard
      colSpan={7}
      rowSpan={1}
      icon={<Bot className="w-5 h-5 text-bento-secondary" />}
      title="Synthesized Analysis"
      subtitle={`Answers grounded strictly in repository context`}
      badge={<Badge variant="primary">AI Response</Badge>}
      action={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            leftIcon={copied ? <Check className="w-3.5 h-3.5 text-bento-success" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
          {onReset && (
            <Button size="sm" variant="ghost" onClick={onReset}>
              Clear
            </Button>
          )}
        </div>
      }
      accentGlow
    >
      <div className="space-y-4">
        {/* User Question Reminder */}
        <div className="p-3 rounded-bento-sm bg-bento-subtle border border-bento-border/70 flex items-start gap-2.5">
          <MessageSquare className="w-4 h-4 text-bento-secondary shrink-0 mt-0.5" />
          <p className="text-bento-14 font-medium text-bento-text italic">
            "{query}"
          </p>
        </div>

        {/* Answer Content */}
        <div className="max-h-[420px] overflow-y-auto pr-2 space-y-2">
          <MarkdownRenderer content={answer} />
        </div>

        {/* Answer Footer telemetry */}
        <div className="flex items-center justify-between text-bento-12 text-bento-muted pt-3 border-t border-bento-border/40">
          <span className="flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-bento-success" />
            Namespace: {repoKey.replace("/", "-")}
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{results.length} chunks referenced</Badge>
            {executionTimeMs && <Badge variant="secondary">{executionTimeMs}ms</Badge>}
          </div>
        </div>
      </div>
    </BentoCard>
  );
}

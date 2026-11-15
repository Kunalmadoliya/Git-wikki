import React from "react";
import { BentoCard } from "../bento/BentoCard";
import { Badge } from "../common/Badge";
import {
  FolderGit2,
  Scissors,
  Database,
  Bot,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export function PipelineFlowCard() {
  const steps = [
    {
      num: "01",
      title: "Octokit Fetch",
      desc: "Fetches repository git tree & blobs with concurrency control (10 parallel workers)",
      icon: <FolderGit2 className="w-5 h-5 text-bento-secondary" />,
      tag: "GitHub API",
    },
    {
      num: "02",
      title: "Recursive Chunker",
      desc: "Splits source code into 2000-char chunks with 400-char overlap via LangChain",
      icon: <Scissors className="w-5 h-5 text-bento-warning" />,
      tag: "TextSplitter",
    },
    {
      num: "03",
      title: "Pinecone Upsert",
      desc: "Stores doc schema records with server-side embeddings in dedicated repo namespace",
      icon: <Database className="w-5 h-5 text-bento-success" />,
      tag: "Pinecone Index",
    },
    {
      num: "04",
      title: "GPT-4o-mini RAG",
      desc: "Performs similarity search, injects top-K chunks as context, and synthesizes answers",
      icon: <Bot className="w-5 h-5 text-bento-secondary" />,
      tag: "ChatOpenAI",
    },
  ];

  return (
    <BentoCard
      colSpan={12}
      rowSpan={1}
      icon={<Sparkles className="w-5 h-5 text-bento-primary-dark" />}
      title="RAG Intelligence Architecture"
      subtitle="Full asynchronous workflow orchestrated by Inngest and LangChain"
      badge={<Badge variant="primary">End-to-End Flow</Badge>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
        {steps.map((step, idx) => (
          <div
            key={step.num}
            className="relative flex flex-col justify-between p-4 rounded-bento-sm bg-bento-subtle/70 border border-bento-border/70 hover:border-bento-secondary/40 transition-all hover:bg-white hover:shadow-sm group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-bento-border flex items-center justify-center shadow-xs">
                  {step.icon}
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="neutral" size="sm">
                    {step.tag}
                  </Badge>
                  <span className="font-mono text-bento-12 font-bold text-bento-light/60">
                    {step.num}
                  </span>
                </div>
              </div>

              <h4 className="text-bento-14 font-semibold text-bento-text mb-1 group-hover:text-bento-secondary transition-colors">
                {step.title}
              </h4>
              <p className="text-bento-12 text-bento-muted leading-relaxed">
                {step.desc}
              </p>
            </div>

            {idx < steps.length - 1 && (
              <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-bento-light pointer-events-none">
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </BentoCard>
  );
}

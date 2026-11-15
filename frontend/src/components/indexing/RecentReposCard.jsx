import React from "react";
import { BentoCard } from "../bento/BentoCard";
import { Badge } from "../common/Badge";
import { BookOpen, GitBranch, ArrowUpRight, Clock, Star } from "lucide-react";

export function RecentReposCard({
  recentRepos = [],
  selectedRepo,
  onSelectRepo,
}) {
  const defaultPopularRepos = [
    {
      repoUrl: "https://github.com/expressjs/express",
      repoKey: "expressjs/express",
      description: "Fast, unopinionated, minimalist web framework",
      tag: "Node.js",
    },
    {
      repoUrl: "https://github.com/facebook/react",
      repoKey: "facebook/react",
      description: "The library for web and native user interfaces",
      tag: "UI",
    },
    {
      repoUrl: "https://github.com/inngest/inngest-js",
      repoKey: "inngest/inngest-js",
      description: "Inngest TypeScript / JavaScript SDK",
      tag: "Workflows",
    },
  ];

  const displayList = recentRepos.length > 0 ? recentRepos : defaultPopularRepos;

  return (
    <BentoCard
      colSpan={5}
      rowSpan={1}
      icon={<GitBranch className="w-5 h-5 text-bento-secondary" />}
      title="Knowledge Namespaces"
      subtitle="Select a repository to query against Pinecone"
      badge={<Badge variant="secondary">{displayList.length} Repos</Badge>}
    >
      <div className="flex flex-col justify-between h-full space-y-2.5">
        <div className="space-y-2 overflow-y-auto max-h-[190px] pr-1">
          {displayList.map((item) => {
            const isSelected = selectedRepo === item.repoUrl;
            return (
              <div
                key={item.repoUrl}
                onClick={() => onSelectRepo(item.repoUrl)}
                className={`group flex items-center justify-between p-2.5 rounded-bento-sm border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-bento-primary/25 border-bento-primary shadow-sm"
                    : "bg-white hover:bg-bento-subtle border-bento-border/70 hover:border-bento-secondary/40"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-bento-12 ${
                      isSelected
                        ? "bg-bento-primary text-bento-text font-bold"
                        : "bg-bento-surface text-bento-secondary"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-bento-14 font-semibold text-bento-text truncate flex items-center gap-1.5">
                      {item.repoKey || item.repoUrl.replace("https://github.com/", "")}
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-bento-success" />
                      )}
                    </p>
                    <p className="text-bento-12 text-bento-muted truncate">
                      {item.description || (item.indexedAt ? `Indexed ${new Date(item.indexedAt).toLocaleDateString()}` : "Ready to query")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {item.tag && <Badge variant="neutral">{item.tag}</Badge>}
                  <ArrowUpRight
                    className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                      isSelected ? "text-bento-text" : "text-bento-light group-hover:text-bento-secondary"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-bento-12 text-bento-muted pt-2 border-t border-bento-border/40">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-bento-light" />
            Namespace: {selectedRepo ? selectedRepo.replace("https://github.com/", "").replace("/", "-") : "none"}
          </span>
          <span className="font-mono text-bento-12 text-bento-secondary">Top-K: 1-20</span>
        </div>
      </div>
    </BentoCard>
  );
}

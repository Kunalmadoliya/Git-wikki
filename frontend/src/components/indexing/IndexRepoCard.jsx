import React, { useState } from "react";
import { BentoCard } from "../bento/BentoCard";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { indexRepository } from "../../services/api";
import {
  FolderGit2,
  KeyRound,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function IndexRepoCard({
  currentRepo,
  onRepoIndexed,
  onSelectRepo,
}) {
  const [repoUrl, setRepoUrl] = useState(
    currentRepo || "https://github.com/expressjs/express"
  );
  const [githubToken, setGithubToken] = useState("");
  const [useServerToken, setUseServerToken] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const queryClient = useQueryClient();

  // TanStack Query Mutation for repository indexing
  const indexMutation = useMutation({
    mutationFn: (payload) => indexRepository(payload),
    onSuccess: (data) => {
      setLastResult(data);
      if (onRepoIndexed) {
        onRepoIndexed({
          repoUrl,
          repoKey: data.repoKey,
          indexedAt: new Date().toISOString(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["systemStatus"] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    indexMutation.mutate({
      repoUrl: repoUrl.trim(),
      githubToken: useServerToken ? undefined : githubToken.trim(),
    });
  };

  return (
    <BentoCard
      colSpan={7}
      rowSpan={1}
      icon={<FolderGit2 className="w-5 h-5" />}
      title="Index Repository"
      subtitle="Connect any public or private GitHub repository to vector memory"
      badge={<Badge variant="primary">Inngest Pipeline</Badge>}
      accentGlow
    >
      <form onSubmit={handleSubmit} className="flex flex-col justify-between h-full space-y-4">
        <div className="space-y-3">
          <Input
            label="GitHub Repository URL"
            placeholder="https://github.com/owner/repository"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={indexMutation.isPending}
            required
            leftIcon={<FolderGit2 className="w-4 h-4" />}
            rightIcon={
              repoUrl && (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-bento-secondary transition-colors"
                  title="Open on GitHub"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )
            }
          />

          {/* Token Configuration Accordion */}
          <div className="rounded-bento-sm bg-bento-subtle/80 border border-bento-border/60 p-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-bento-12 font-medium text-bento-muted hover:text-bento-text transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-bento-secondary" />
                Authentication: {useServerToken ? "Server Environment Token (Auto)" : "Custom Personal Access Token"}
              </span>
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-3 pt-3 border-t border-bento-border/50 space-y-3">
                <div className="flex items-center gap-4 text-bento-12">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tokenMode"
                      checked={useServerToken}
                      onChange={() => setUseServerToken(true)}
                      className="accent-[#80A1C1]"
                    />
                    <span className="font-medium text-bento-text">Use Server Token (.env)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tokenMode"
                      checked={!useServerToken}
                      onChange={() => setUseServerToken(false)}
                      className="accent-[#80A1C1]"
                    />
                    <span className="font-medium text-bento-text">Custom PAT Token</span>
                  </label>
                </div>

                {!useServerToken && (
                  <Input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    hint="Requires repo read permissions for private repos or higher rate limits."
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Feedback Messages */}
        {indexMutation.isError && (
          <div className="flex items-start gap-2.5 p-3 rounded-bento-sm bg-red-50 border border-red-200 text-bento-danger text-bento-12">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{indexMutation.error.message}</span>
          </div>
        )}

        {indexMutation.isSuccess && lastResult && (
          <div className="flex items-center justify-between p-3 rounded-bento-sm bg-emerald-50 border border-emerald-200 text-emerald-800 text-bento-12">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-bento-success" />
              <span>
                <strong>{lastResult.repoKey}</strong> indexing event dispatched to Inngest!
              </span>
            </div>
            {onSelectRepo && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSelectRepo(repoUrl)}
                className="text-bento-12 py-1 h-7 bg-white"
              >
                Query Now
              </Button>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2 border-t border-bento-border/40">
          <span className="text-bento-12 text-bento-muted">
            Batch size: 500 docs/step • Chunk size: 2000
          </span>
          <Button
            type="submit"
            variant="primary"
            isLoading={indexMutation.isPending}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            {indexMutation.isPending ? "Starting Ingestion..." : "Start Indexing"}
          </Button>
        </div>
      </form>
    </BentoCard>
  );
}

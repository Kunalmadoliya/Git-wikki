import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  createSource,
  deleteSource,
  retrySource,
} from "../../services/api";

function sourceLabel(source) {
  return source?.repoKey || source?.repoUrl?.replace("https://github.com/", "");
}

function statusText(source) {
  if (!source) return null;
  if (source.stage === "READY") return `${sourceLabel(source)} is ready`;
  if (source.stage === "FAILED") {
    return source.error?.message || "Indexing failed.";
  }
  return source.progress?.stageDescription || source.stage;
}

export function RepositoryIndexer({
  sources,
  activeSource,
  onSourceAdded,
  onSourceSelected,
  onSourceRemoved,
  onSourceUpdated,
}) {
  const [repoUrl, setRepoUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const addMutation = useMutation({
    mutationFn: createSource,
    onSuccess: (source) => {
      onSourceAdded(source);
      setRepoUrl("");
      setGithubToken("");
    },
  });

  const retryMutation = useMutation({
    mutationFn: ({ sourceId }) => retrySource(sourceId, githubToken),
    onSuccess: onSourceUpdated,
  });

  const removeMutation = useMutation({
    mutationFn: deleteSource,
    onSuccess: (_, sourceId) => onSourceRemoved(sourceId),
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!repoUrl.trim() || addMutation.isPending) return;
    addMutation.mutate({ repoUrl, githubToken });
  };

  const progress = activeSource?.progress;
  const isFailed = activeSource?.stage === "FAILED";

  return (
    <section className="space-y-3">
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex gap-2">
          <input
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="Paste a GitHub repository link"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            type="url"
          />
          <button
            type="submit"
            disabled={!repoUrl.trim() || addMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowToken((visible) => !visible)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
        >
          {showToken ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Private repo? Add token
        </button>
        {showToken && (
          <input
            type="password"
            value={githubToken}
            onChange={(event) => setGithubToken(event.target.value)}
            placeholder="GitHub token (kept in memory only)"
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        )}
        {addMutation.isError && (
          <p className="mt-2 text-xs text-rose-600">{addMutation.error.message}</p>
        )}
      </form>

      {sources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sources.map((source) => (
            <div
              key={source.sourceId}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                source.sourceId === activeSource?.sourceId
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <button type="button" onClick={() => onSourceSelected(source.sourceId)} className="max-w-[220px] truncate">
                {sourceLabel(source)}
              </button>
              <button
                type="button"
                aria-label={`Delete ${sourceLabel(source)}`}
                onClick={() => removeMutation.mutate(source.sourceId)}
                className="rounded-full p-0.5 hover:bg-slate-200"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeSource && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className={isFailed ? "text-rose-600" : "text-slate-700"}>
              {statusText(activeSource)}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-slate-500">
              {progress?.percentage ?? 0}%
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all ${isFailed ? "bg-rose-500" : "bg-blue-600"}`}
              style={{ width: `${progress?.percentage ?? 0}%` }}
            />
          </div>
          {isFailed && (
            <button
              type="button"
              onClick={() => retryMutation.mutate({ sourceId: activeSource.sourceId })}
              disabled={retryMutation.isPending}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          )}
        </div>
      )}
    </section>
  );
}

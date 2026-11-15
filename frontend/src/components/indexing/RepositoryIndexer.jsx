import React, { useEffect, useState } from "react";
import { BentoCard } from "../bento/BentoCard";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchIndexStatus, indexRepository } from "../../services/api";
import {
  FolderGit2,
  KeyRound,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Database,
  Layers,
} from "lucide-react";

export function RepositoryIndexer({
  currentRepo,
  onIndexingComplete,
  onSelectRepo,
}) {
  const [repoUrl, setRepoUrl] = useState(
    currentRepo || "https://github.com/expressjs/express"
  );
  const [githubToken, setGithubToken] = useState("");
  const [useServerToken, setUseServerToken] = useState(true);
  const [showTokenSettings, setShowTokenSettings] = useState(false);
  const [indexAcknowledged, setIndexAcknowledged] = useState(false);
  const [ackDetails, setAckDetails] = useState(null);
  const [indexJob, setIndexJob] = useState(null);

  const queryClient = useQueryClient();

  const indexMutation = useMutation({
    mutationFn: (payload) => indexRepository(payload),
    onSuccess: (data) => {
      setIndexAcknowledged(true);
      setAckDetails({
        repoKey: data.repoKey,
        jobId: data.jobId,
        repoUrl: repoUrl.trim(),
        namespace: data.repoKey.replace("/", "-"),
        timestamp: new Date().toLocaleTimeString(),
        status: data.status,
      });
      setIndexJob(data);
      onSelectRepo?.(repoUrl.trim());
      queryClient.invalidateQueries({ queryKey: ["systemStatus"] });
    },
  });

  useEffect(() => {
    if (!indexJob?.jobId) return undefined;

    let cancelled = false;
    const poll = async () => {
      try {
        const status = await fetchIndexStatus(indexJob.jobId);
        if (cancelled) return;
        setAckDetails((current) => ({ ...current, ...status }));
        if (status.status === "completed") {
          setIndexJob(null);
          onIndexingComplete?.({
            repoUrl: repoUrl.trim(),
            repoKey: status.repoKey,
            namespace: status.repoKey.replace("/", "-"),
          });
        } else if (status.status === "failed") {
          setIndexJob(null);
          indexMutation.reset();
        }
      } catch (error) {
        if (!cancelled) {
          setIndexJob(null);
          setAckDetails((current) => ({
            ...current,
            status: "failed",
            error: "Failed to read indexing status",
          }));
          console.error("[indexing] Failed to poll job status:", error);
        }
      }
    };

    poll();
    const timer = window.setInterval(poll, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [indexJob?.jobId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setIndexAcknowledged(false);
    indexMutation.mutate({
      repoUrl: repoUrl.trim(),
      githubToken: useServerToken ? undefined : githubToken.trim(),
    });
  };

  const quickPresets = [
    { label: "expressjs/express", url: "https://github.com/expressjs/express" },
    { label: "facebook/react", url: "https://github.com/facebook/react" },
    { label: "langchain-ai/langchainjs", url: "https://github.com/langchain-ai/langchainjs" },
  ];

  return (
    <BentoCard
      colSpan={12}
      icon={<FolderGit2 className="w-5 h-5 text-blue-600" />}
      title="Phase 1: Repository Ingestion & Inngest Indexing"
      subtitle="Connect any GitHub repository URL to initiate Inngest async chunking & Pinecone vector storage"
      badge={
        <Badge
          variant={
            ackDetails?.status === "completed"
              ? "success"
              : ackDetails?.status === "failed"
                ? "danger"
                : "primary"
          }
          dot={Boolean(indexAcknowledged)}
        >
          {ackDetails?.status === "completed"
            ? "Index Ready"
            : ackDetails?.status === "running"
              ? "Indexing"
              : ackDetails?.status === "failed"
                ? "Index Failed"
                : indexAcknowledged
                  ? "Queued"
                  : "Phase 1"}
        </Badge>
      }
      glow={indexAcknowledged}
      className="bg-white"
    >
      <div className="space-y-6">
        {/* Input Bar Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <FolderGit2 className="w-4 h-4" />
              </div>
              <input
                type="url"
                required
                placeholder="https://github.com/owner/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={indexMutation.isPending}
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-2xs"
              />
              {repoUrl && (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Open GitHub Repo"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={indexMutation.isPending}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="shrink-0"
            >
              {indexMutation.isPending ? "Indexing Repository..." : "Index Repository"}
            </Button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
            <span className="font-sans font-medium text-slate-600">Quick Presets:</span>
            {quickPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setRepoUrl(preset.url)}
                className="font-mono px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 transition-all shadow-2xs"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Optional GitHub Token Toggle (Zero Login by Default) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowTokenSettings(!showTokenSettings)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors font-medium"
            >
              <KeyRound className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Authentication Mode: <strong className="text-slate-800">{useServerToken ? "Zero Login (Server Environment Token)" : "Custom Personal Access Token"}</strong>
              </span>
              {showTokenSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showTokenSettings && (
              <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="radio"
                      name="tokenSelection"
                      checked={useServerToken}
                      onChange={() => setUseServerToken(true)}
                      className="accent-blue-600"
                    />
                    <span>Use Server Token from backend .env (Zero login required)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="radio"
                      name="tokenSelection"
                      checked={!useServerToken}
                      onChange={() => setUseServerToken(false)}
                      className="accent-blue-600"
                    />
                    <span>Provide Custom PAT</span>
                  </label>
                </div>

                {!useServerToken && (
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 font-mono outline-none focus:border-blue-500"
                  />
                )}
              </div>
            )}
          </div>
        </form>

        {/* Indexing Phase Pipeline Progress Tracker */}
        {(indexMutation.isPending || indexJob) && (
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
            <div className="flex items-center justify-between text-xs text-blue-700 font-medium">
              <span className="flex items-center gap-2 font-semibold">
                <Sparkles className="w-4 h-4 animate-spin text-blue-600" />
                {ackDetails?.phase === "completed"
                  ? "Indexing complete"
                  : "Inngest Ingestion Pipeline in Progress..."}
              </span>
              <span className="font-mono text-blue-600">Batch Size: 500 docs/step</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-1">
              <div className="p-2.5 rounded-lg bg-white border border-blue-200/80 flex items-center gap-2 text-xs text-slate-700 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>1. Parse & Verify Repo</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-blue-200/80 flex items-center gap-2 text-xs text-slate-700 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>2. Fetch GitHub Tree</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-blue-200/80 flex items-center gap-2 text-xs text-slate-700 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>3. Chunk Text (2000c)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-blue-200/80 flex items-center gap-2 text-xs text-slate-700 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>4. Upsert Pinecone</span>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {indexMutation.isError && !indexJob && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold text-rose-900">Indexing Failed</p>
              <p className="mt-0.5 text-rose-700">{indexMutation.error.message}</p>
            </div>
          </div>
        )}

        {/* INNGEST ACKNOWLEDGMENT STATE (Phase Unlocked) */}
        {indexAcknowledged && ackDetails && (
          <div className={`p-5 rounded-xl border space-y-3.5 shadow-xs ${
            ackDetails.status === "failed"
              ? "bg-rose-50 border-rose-300"
              : ackDetails.status === "completed"
                ? "bg-emerald-50 border-emerald-300"
                : "bg-blue-50 border-blue-300"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                  {ackDetails.status === "completed" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                    {ackDetails.status === "completed"
                      ? "Inngest Acknowledgment Received: Repository Indexed!"
                      : `Inngest job ${ackDetails.status || "queued"}`}
                  </h4>
                  <p className="text-xs text-emerald-700 font-mono mt-0.5">
                    Namespace: <span className="font-bold underline">{ackDetails.namespace}</span> • Dispatched at {ackDetails.timestamp}
                  </p>
                </div>
              </div>

              {ackDetails.status === "completed" && <Button
                size="sm"
                variant="emerald"
                onClick={() => {
                  const chatEl = document.getElementById("codebase-chatbot-section");
                  if (chatEl) {
                    chatEl.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Proceed to Query Chatbot
              </Button>}
            </div>

            <div className="text-xs text-emerald-800 leading-relaxed pt-2 border-t border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${
                ackDetails.status === "completed" ? "text-emerald-600" : "text-blue-600"
              }`} />
              <span>
                {ackDetails.status === "completed"
                  ? `All source files have been parsed, chunked, and upserted into Pinecone vector storage (${ackDetails.chunksUpserted || 0} chunks). You can now ask questions to the chatbot below!`
                  : ackDetails.status === "failed"
                    ? `Indexing failed: ${ackDetails.error || "The background job could not complete."}`
                    : `Inngest is ${ackDetails.phase || "processing"} this repository. Querying will unlock when Pinecone storage is ready.`}
              </span>
            </div>
          </div>
        )}
      </div>
    </BentoCard>
  );
}

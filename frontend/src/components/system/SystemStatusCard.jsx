import React from "react";
import { BentoCard } from "../bento/BentoCard";
import { Badge } from "../common/Badge";
import { useQuery } from "@tanstack/react-query";
import { fetchSystemStatus } from "../../services/api";
import {
  Activity,
  Server,
  Database,
  Bot,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from "lucide-react";

export function SystemStatusCard() {
  const {
    data: status,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["systemStatus"],
    queryFn: fetchSystemStatus,
    refetchInterval: 30000, // 30s poll
  });

  const isOnline = !isError && status?.status === "online";

  return (
    <BentoCard
      colSpan={5}
      rowSpan={1}
      icon={<Activity className="w-5 h-5 text-bento-success" />}
      title="System Health"
      subtitle="Live backend & cloud engine telemetry"
      badge={
        <Badge variant={isOnline ? "success" : "danger"} dot>
          {isLoading ? "Checking..." : isOnline ? "Online" : "Offline"}
        </Badge>
      }
      action={
        <button
          onClick={() => refetch()}
          title="Refresh status"
          className="p-1.5 rounded-lg hover:bg-bento-subtle text-bento-light hover:text-bento-text transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-bento-secondary" : ""}`} />
        </button>
      }
    >
      <div className="flex flex-col justify-between h-full space-y-3">
        <div className="grid grid-cols-2 gap-2 text-bento-12">
          {/* Express Backend */}
          <div className="p-2.5 rounded-bento-sm bg-bento-subtle border border-bento-border/70 flex flex-col justify-between">
            <span className="text-bento-muted flex items-center gap-1.5 font-medium">
              <Server className="w-3.5 h-3.5 text-bento-secondary" /> Express API
            </span>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-bento-12 font-semibold">Port 3000</span>
              {isOnline ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-bento-success" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-bento-danger" />
              )}
            </div>
          </div>

          {/* Pinecone Vector DB */}
          <div className="p-2.5 rounded-bento-sm bg-bento-subtle border border-bento-border/70 flex flex-col justify-between">
            <span className="text-bento-muted flex items-center gap-1.5 font-medium">
              <Database className="w-3.5 h-3.5 text-bento-secondary" /> Pinecone
            </span>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-bento-12 font-semibold">
                {status?.pineconeIndex || "ocr"}
              </span>
              <Badge variant="success" size="sm">Active</Badge>
            </div>
          </div>

          {/* OpenAI LLM */}
          <div className="p-2.5 rounded-bento-sm bg-bento-subtle border border-bento-border/70 flex flex-col justify-between">
            <span className="text-bento-muted flex items-center gap-1.5 font-medium">
              <Bot className="w-3.5 h-3.5 text-bento-secondary" /> OpenAI Model
            </span>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-bento-12 font-semibold">gpt-4o-mini</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-bento-success" />
            </div>
          </div>

          {/* Inngest Background Pipeline */}
          <div className="p-2.5 rounded-bento-sm bg-bento-subtle border border-bento-border/70 flex flex-col justify-between">
            <span className="text-bento-muted flex items-center gap-1.5 font-medium">
              <Activity className="w-3.5 h-3.5 text-bento-secondary" /> Inngest Workers
            </span>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-bento-12 font-semibold">Dev Server</span>
              <Badge variant="primary" size="sm">Event-driven</Badge>
            </div>
          </div>
        </div>

        {/* Health status summary bar */}
        <div className="flex items-center justify-between text-bento-12 text-bento-muted pt-2 border-t border-bento-border/40">
          <span className="truncate">
            {isOnline ? "Connected to RAG inference server" : "Waiting for backend on localhost:3000"}
          </span>
          <span className="font-mono text-[11px] text-bento-light">
            v1.0.0
          </span>
        </div>
      </div>
    </BentoCard>
  );
}

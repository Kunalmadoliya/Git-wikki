import React from "react";
import { BentoCard } from "../bento/BentoCard";
import { Badge } from "../common/Badge";
import { useQuery } from "@tanstack/react-query";
import { fetchSystemStatus } from "../../services/api";
import {
  Database,
  GitBranch,
  Server,
} from "lucide-react";

export function DashboardMetrics({ activeRepo = "" }) {
  const { data: status, isError } = useQuery({
    queryKey: ["systemStatus"],
    queryFn: fetchSystemStatus,
    refetchInterval: 30000,
  });

  const isOnline = !isError && status?.status === "online";
  const repoName = activeRepo ? activeRepo.replace("https://github.com/", "") : "expressjs/express";
  const namespace = activeRepo ? repoName.replace("/", "-") : "expressjs-express";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      {/* Card 1: Backend & Inngest Worker Engine */}
      <BentoCard
        colSpan={12}
        className="!p-5 bg-white"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-sans font-medium">API & Background Engine</p>
              <h4 className="text-sm font-semibold text-slate-900 font-sans mt-0.5">
                Express + Inngest Workers
              </h4>
            </div>
          </div>
          <Badge variant={isOnline ? "success" : "warning"} dot>
            {isOnline ? "Online" : "Connecting"}
          </Badge>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>Port 3000</span>
          <span className="text-slate-700 font-medium">Async Event Pipeline</span>
        </div>
      </BentoCard>

      {/* Card 2: Pinecone Vector Store */}
      <BentoCard
        colSpan={12}
        className="!p-5 bg-white"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-2xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-sans font-medium">Vector Database</p>
              <h4 className="text-sm font-semibold text-slate-900 font-sans mt-0.5">
                Pinecone Index: {status?.pineconeIndex || "ocr"}
              </h4>
            </div>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>Inference: Integrated</span>
          <span className="text-emerald-600 font-medium">Similarity Top-K</span>
        </div>
      </BentoCard>

      {/* Card 3: Active Target Namespace */}
      <BentoCard
        colSpan={12}
        className="!p-5 bg-white"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-sans font-medium">Active Target</p>
              <h4 className="text-sm font-semibold text-slate-900 font-sans mt-0.5 truncate max-w-[170px]">
                {repoName}
              </h4>
            </div>
          </div>
          <Badge variant="primary" size="sm">
            Ready
          </Badge>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
          <span className="truncate">ns: {namespace}</span>
          <span className="text-indigo-600 font-medium">GPT-4o-mini</span>
        </div>
      </BentoCard>
    </div>
  );
}

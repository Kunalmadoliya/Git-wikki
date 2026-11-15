import React, { useState } from "react";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { DashboardMetrics } from "./components/telemetry/DashboardMetrics";
import { RepositoryIndexer } from "./components/indexing/RepositoryIndexer";
import { CodebaseChatbot } from "./components/chat/CodebaseChatbot";
import { useQuery } from "@tanstack/react-query";
import { fetchSystemStatus } from "./services/api";
import { Sparkles } from "lucide-react";

function repoKeyFromUrl(repoUrl) {
  return repoUrl
    .trim()
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
}

export function App() {
  const [activeRepo, setActiveRepo] = useState(
    () => localStorage.getItem("gitwiki_active_repo") || "https://github.com/expressjs/express"
  );
  const [indexedRepoKey, setIndexedRepoKey] = useState(null);

  const { data: statusData, isSuccess } = useQuery({
    queryKey: ["systemStatus"],
    queryFn: fetchSystemStatus,
    staleTime: 1000 * 30,
  });

  const handleIndexingComplete = (repoInfo) => {
    setActiveRepo(repoInfo.repoUrl);
    setIndexedRepoKey(repoInfo.repoKey);
    localStorage.setItem("gitwiki_active_repo", repoInfo.repoUrl);
  };

  const handleRepoSelection = (repoUrl) => {
    setActiveRepo(repoUrl);
    setIndexedRepoKey(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white relative">
      {/* Symmetric Dotted Background Grid */}
      <div className="fixed inset-0 bg-dotted-pattern pointer-events-none z-0 opacity-70" />

      {/* Header */}
      <Header
        systemOnline={isSuccess && statusData?.status === "online"}
        activeRepo={activeRepo}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Top Hero Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/70 border border-slate-200/90 shadow-xs backdrop-blur-md">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-mono text-blue-700">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Two-Phase RAG Flow • Index Then Query</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 font-sans">
              Repository Knowledge Assistant
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl font-sans leading-relaxed">
              Upload any GitHub link to trigger Inngest background chunking into Pinecone,
              then chat with the codebase below with cited source references.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-sans shadow-2xs">
              <span className="text-slate-400 block text-[11px]">Access Mode:</span>
              <span className="font-semibold text-emerald-600">Zero Login Required</span>
            </div>
          </div>
        </div>

        {/* Bento Dashboard Metrics Telemetry */}
        <DashboardMetrics activeRepo={activeRepo} />

        {/* Phase 1: Ingestion & Indexing */}
        <RepositoryIndexer
          currentRepo={activeRepo}
          onIndexingComplete={handleIndexingComplete}
          onSelectRepo={handleRepoSelection}
        />

        {/* Phase 2: Interactive Codebase Chatbot */}
        <CodebaseChatbot
          targetRepo={activeRepo}
          isIndexed={indexedRepoKey === repoKeyFromUrl(activeRepo)}
        />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;

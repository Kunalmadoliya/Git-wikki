import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CodebaseChatbot } from "./components/chat/CodebaseChatbot";
import { RepositoryIndexer } from "./components/indexing/RepositoryIndexer";
import { Header } from "./components/layout/Header";
import {
  fetchSourceStatus,
  fetchSources,
  fetchSystemStatus,
} from "./services/api";

export function App() {
  const [sources, setSources] = useState([]);
  const [activeSourceId, setActiveSourceId] = useState(
    () => localStorage.getItem("gitwiki_active_source") || null,
  );
  const { data: systemStatus, isSuccess: healthCheckSucceeded } = useQuery({
    queryKey: ["systemStatus"],
    queryFn: fetchSystemStatus,
    retry: false,
    refetchInterval: 30_000,
  });
  const { data: initialSources } = useQuery({
    queryKey: ["sources"],
    queryFn: fetchSources,
  });

  useEffect(() => {
    if (!initialSources) return;
    setSources(initialSources);
    if (
      initialSources[0] &&
      (!activeSourceId ||
        !initialSources.some((source) => source.sourceId === activeSourceId))
    ) {
      setActiveSourceId(initialSources[0].sourceId);
    }
  }, [initialSources, activeSourceId]);

  const activeSource = useMemo(
    () => sources.find((source) => source.sourceId === activeSourceId) || null,
    [sources, activeSourceId],
  );

  useEffect(() => {
    if (!activeSourceId || !activeSource || ["READY", "FAILED", "CANCELLED"].includes(activeSource.stage)) {
      return undefined;
    }

    let pollingTimer;
    const updateSource = (source) => {
      setSources((current) =>
        current.map((item) => (item.sourceId === source.sourceId ? source : item)),
      );
    };
    const eventStream = new EventSource(`/api/sources/${encodeURIComponent(activeSourceId)}/events`);
    const handleEvent = (event) => {
      try {
        updateSource(JSON.parse(event.data));
      } catch {
        // The status endpoint remains the authoritative fallback.
      }
    };
    const poll = () => {
      fetchSourceStatus(activeSourceId).then(updateSource).catch(() => undefined);
    };

    eventStream.addEventListener("source.updated", handleEvent);
    eventStream.onerror = () => {
      eventStream.close();
      poll();
      pollingTimer = window.setInterval(poll, 2000);
    };
    return () => {
      eventStream.close();
      window.clearInterval(pollingTimer);
    };
  }, [activeSourceId, activeSource?.stage]);

  const selectSource = (sourceId) => {
    setActiveSourceId(sourceId);
    localStorage.setItem("gitwiki_active_source", sourceId);
  };

  const addSource = (source) => {
    setSources((current) => [
      source,
      ...current.filter((item) => item.sourceId !== source.sourceId),
    ]);
    selectSource(source.sourceId);
  };

  const updateSource = (source) => {
    setSources((current) =>
      current.map((item) => (item.sourceId === source.sourceId ? source : item)),
    );
  };

  const removeSource = (sourceId) => {
    setSources((current) => current.filter((source) => source.sourceId !== sourceId));
    if (sourceId === activeSourceId) {
      const next = sources.find((source) => source.sourceId !== sourceId);
      setActiveSourceId(next?.sourceId || null);
      if (next) localStorage.setItem("gitwiki_active_source", next.sourceId);
      else localStorage.removeItem("gitwiki_active_source");
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header systemOnline={healthCheckSucceeded && systemStatus?.status === "online"} />
      <main className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-5 py-8">
        <RepositoryIndexer
          sources={sources}
          activeSource={activeSource}
          onSourceAdded={addSource}
          onSourceSelected={selectSource}
          onSourceRemoved={removeSource}
          onSourceUpdated={updateSource}
        />
        <CodebaseChatbot activeSource={activeSource} />
      </main>
    </div>
  );
}

export default App;

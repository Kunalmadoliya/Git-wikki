import React, { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, Send, User } from "lucide-react";
import { queryRepository } from "../../services/api";

function sourceName(source) {
  return source?.repoKey || "this repository";
}

function formatStatus(source) {
  if (!source) return "Add a repository to start";
  if (source.stage === "READY") return "";
  return `Indexing: ${(source.progress?.stageDescription || source.stage).toLowerCase()}`;
}

function Message({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
          isUser
            ? "rounded-br-sm bg-blue-600 text-white"
            : "rounded-bl-sm bg-slate-100 text-slate-800"
        }`}
      >
        {message.content}
        {message.sources?.length > 0 && (
          <div className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-500">
            {message.sources.length} citations
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

export function CodebaseChatbot({ activeSource }) {
  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);
  const queryMutation = useMutation({
    mutationFn: queryRepository,
    onSuccess: (data) => {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer, sources: data.results || [] },
      ]);
    },
    onError: (error) => {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: error.message || "Query failed." },
      ]);
    },
  });

  useEffect(() => {
    setMessages([]);
    setInputQuery("");
  }, [activeSource?.sourceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, queryMutation.isPending]);

  const isReady = activeSource?.stage === "READY";
  const canSend =
    Boolean(activeSource) &&
    isReady &&
    Boolean(inputQuery.trim()) &&
    !queryMutation.isPending;
  const disabledReason = queryMutation.isPending
    ? "Querying..."
    : formatStatus(activeSource) || (!inputQuery.trim() ? "Ask a question to send" : "");
  const suggestions = activeSource?.summary?.suggestedQueries?.length
    ? activeSource.summary.suggestedQueries
    : [];

  const handleSend = (event) => {
    event?.preventDefault();
    if (!canSend) return;
    const query = inputQuery.trim();
    setInputQuery("");
    setMessages((current) => [...current, { role: "user", content: query }]);
    queryMutation.mutate({ sourceId: activeSource.sourceId, query });
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.isComposing &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-[360px] flex-col p-4">
        <div className="flex-1 space-y-3">
          {messages.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500">
                {activeSource?.summary?.overview || "Add a repo link to get started"}
              </p>
              {isReady && suggestions.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {suggestions.slice(0, 3).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setInputQuery(suggestion)}
                      className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-100"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {messages.map((message, index) => (
            <Message key={`${message.role}-${index}`} message={message} />
          ))}
          {queryMutation.isPending && (
            <p className="text-xs text-slate-400">Searching the repository...</p>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="mt-5 border-t border-slate-100 pt-3">
          <div className="flex items-end gap-2">
            <textarea
              value={inputQuery}
              onChange={(event) => setInputQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Ask a question about the codebase"
              className="min-h-[52px] flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
          <p className="mt-2 min-h-4 text-xs text-slate-500">{disabledReason}</p>
        </form>
      </div>
    </section>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { BentoCard } from "../bento/BentoCard";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { useMutation } from "@tanstack/react-query";
import { queryRepository } from "../../services/api";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Copy,
  Check,
  FileCode2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Terminal,
  Trash2,
} from "lucide-react";

/**
 * Markdown & Code formatter for Assistant responses
 */
function FormattedMessage({ content }) {
  if (!content) return null;

  // Split code blocks ```code```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-800 font-sans">
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const firstLineBreak = part.indexOf("\n");
          const lang = firstLineBreak !== -1 ? part.slice(3, firstLineBreak).trim() : "code";
          const code = firstLineBreak !== -1 ? part.slice(firstLineBreak + 1, -3) : part.slice(3, -3);

          return <CodeBlock key={index} code={code} lang={lang} />;
        }

        const lines = part.split("\n");
        return (
          <div key={index} className="space-y-2">
            {lines.map((line, lIndex) => {
              const trimmed = line.trim();
              if (!trimmed) return null;

              if (trimmed.startsWith("### ")) {
                return (
                  <h4 key={lIndex} className="text-sm font-bold text-blue-600 mt-2 font-sans">
                    {trimmed.replace("### ", "")}
                  </h4>
                );
              }
              if (trimmed.startsWith("## ")) {
                return (
                  <h3 key={lIndex} className="text-base font-bold text-slate-900 mt-3 border-b border-slate-200 pb-1 font-sans">
                    {trimmed.replace("## ", "")}
                  </h3>
                );
              }
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <div key={lIndex} className="flex items-start gap-2 pl-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                    <span>{parseInline(trimmed.substring(2))}</span>
                  </div>
                );
              }

              return (
                <p key={lIndex} className="text-slate-800 font-sans">
                  {parseInline(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function parseInline(text) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-blue-700 font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-[#0F172A] shadow-md text-left">
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-400">
        <span className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          {lang}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-slate-200 leading-normal">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function CodebaseChatbot({ targetRepo, isIndexed = false }) {
  const [inputQuery, setInputQuery] = useState("");
  const [topK, setTopK] = useState(5);
  const [messages, setMessages] = useState([
    {
      id: "initial-welcome",
      role: "assistant",
      content: `👋 **GitWiki Assistant Online.**\n\nTargeting **${targetRepo.replace("https://github.com/", "")}**.\n\nAsk me anything about this repository: from architecture overviews, routing logic, and data flow, to specific functions and edge cases.`,
      sources: [],
      timestamp: "Just now",
    },
  ]);
  const [expandedSources, setExpandedSources] = useState({});

  const chatBottomRef = useRef(null);

  const queryMutation = useMutation({
    mutationFn: (payload) => queryRepository(payload),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: data.answer,
          sources: data.results || [],
          repoKey: data.repoKey,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `⚠️ **Query Error:** ${error.message || "Failed to query repository from Pinecone vector store."}`,
          sources: [],
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    },
  });

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, queryMutation.isPending]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!isIndexed || !inputQuery.trim() || queryMutation.isPending) return;

    const userQuestion = inputQuery.trim();
    setInputQuery("");

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: userQuestion,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    queryMutation.mutate({
      repoUrl: targetRepo,
      query: userQuestion,
      topK: Number(topK),
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSources = (msgId) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const samplePrompts = [
    "Explain project architecture & core flow",
    "Where is request routing handled?",
    "How does document chunking work?",
    "What dependencies and scripts are defined?",
  ];

  return (
    <div id="codebase-chatbot-section">
      <BentoCard
        colSpan={12}
        icon={<Bot className="w-5 h-5 text-blue-600" />}
        title="Phase 2: Codebase Intelligence Chatbot"
        subtitle={`Chat with: ${targetRepo.replace("https://github.com/", "")}`}
        badge={
          <Badge variant={isIndexed ? "success" : "primary"}>
          {isIndexed ? "Index Loaded" : "Index Required"}
          </Badge>
        }
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setMessages([
                {
                  id: "initial-welcome",
                  role: "assistant",
                  content: `Conversation cleared. Targeting **${targetRepo.replace("https://github.com/", "")}**. Ask any question to search Pinecone vectors.`,
                  sources: [],
                  timestamp: "Just now",
                },
              ])
            }
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Clear Chat
          </Button>
        }
        className="bg-white"
      >
        {!isIndexed && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Index this repository and wait for the <strong>Index Ready</strong> state before querying it.
          </div>
        )}
        <div className="flex flex-col h-[650px] space-y-4">
          {/* Chat Message Scrollable Container */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border text-xs ${
                      isUser
                        ? "bg-blue-600 border-blue-500 text-white shadow-xs"
                        : "bg-slate-100 border-slate-200 text-blue-600"
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 space-y-2 border shadow-2xs ${
                      isUser
                        ? "bg-blue-600 text-white border-blue-500 rounded-tr-none"
                        : "bg-slate-50 text-slate-800 border-slate-200 rounded-tl-none"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 text-[11px] pb-1 border-b font-sans opacity-80">
                      <span className="font-semibold">
                        {isUser ? "You" : "GitWiki Assistant (GPT-4o-mini)"}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {isUser ? (
                      <p className="text-sm font-sans whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <FormattedMessage content={msg.content} />
                    )}

                    {/* Citations / Sources Accordion if available */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="pt-2 mt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => toggleSources(msg.id)}
                          className="flex items-center justify-between w-full text-xs text-blue-600 hover:text-blue-800 font-mono py-1 transition-colors"
                        >
                          <span className="flex items-center gap-1.5 font-semibold">
                            <FileCode2 className="w-3.5 h-3.5" />
                            {msg.sources.length} Pinecone Citations & Chunks
                          </span>
                          {expandedSources[msg.id] ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {expandedSources[msg.id] && (
                          <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                            {msg.sources.map((src, sIdx) => {
                              const scorePercent = src.score ? Math.round(src.score * 100) : null;
                              return (
                                <div
                                  key={sIdx}
                                  className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-mono space-y-1.5 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between text-slate-600">
                                    <span className="font-semibold text-slate-900 truncate max-w-[70%]">
                                      {src.source || `Chunk #${sIdx + 1}`}
                                    </span>
                                    {scorePercent && (
                                      <Badge variant="success" size="sm">
                                        {scorePercent}% match
                                      </Badge>
                                    )}
                                  </div>
                                  <pre className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-800 whitespace-pre-wrap max-h-24 overflow-y-auto">
                                    <code>{src.content}</code>
                                  </pre>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {queryMutation.isPending && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-blue-600 shrink-0">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-none bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-blue-600 font-mono font-medium">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    Searching Pinecone vector namespace & synthesizing answer with GPT-4o-mini...
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Prompt Recommendations */}
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <span className="text-xs text-slate-500 flex items-center gap-1 font-sans font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Prompts:
            </span>
            {samplePrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInputQuery(prompt)}
                className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all font-sans"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Bottom Chat Input Form */}
          <form onSubmit={handleSend} className="space-y-3 pt-2 border-t border-slate-100">
            <div className="relative flex items-center">
              <textarea
                rows={2}
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask any question about the codebase (Press Enter to send, Shift+Enter for newline)..."
                disabled={queryMutation.isPending}
                className="w-full pl-4 pr-24 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 font-sans outline-none resize-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
              />
              <div className="absolute right-3 flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  isLoading={queryMutation.isPending}
                  disabled={!isIndexed || !inputQuery.trim()}
                  rightIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Send
                </Button>
              </div>
            </div>

            {/* Telemetry & Top-K bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-sans">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 font-mono text-slate-600 font-medium">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" /> Top-K Citations:
                </span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={topK}
                  onChange={(e) => setTopK(e.target.value)}
                  className="w-24 accent-blue-600 cursor-pointer"
                />
                <span className="font-mono text-blue-600 font-bold">{topK}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Pinecone Document Inference • Zero Login Required
              </span>
            </div>
          </form>
        </div>
      </BentoCard>
    </div>
  );
}

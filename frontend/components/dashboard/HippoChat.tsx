"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface HippoChatProps {
  fullHeight?: boolean;
  patientId?: string;
}

export default function HippoChat({ fullHeight = false, patientId }: HippoChatProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>("OpenAI Agent SDK");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active patient ID: passed via prop or retrieved from logged in user
  const activePatientId = patientId || (session?.user as any)?.id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Fetch initial Agent SDK status
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/chat/status");
        if (res.ok) {
          const data = await res.json();
          if (data.model) {
            const shortModel = data.model.includes("/") ? data.model.split("/")[1] : data.model;
            setAgentStatus(`OpenAI Agent SDK • ${shortModel}`);
          }
        }
      } catch (e) {
        // Fallback status
      }
    }
    checkStatus();
  }, []);

  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || inputMessage;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customMessage) setInputMessage("");
    setIsLoading(true);

    try {
      // Build history for context
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(activePatientId ? { "x-user-id": activePatientId } : {}),
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: history,
          patientId: activePatientId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.detail || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message?.content || "I apologize, but I could not process your request.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `⚠️ **Clinical Agent Error**: ${err.message || "Failed to reach AI Agent."}\n\nPlease verify that your backend server and API key configuration are active.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const quickPrompts = [
    "Analyze my recent health metrics",
    "Heart-healthy dietary suggestions",
    "How to improve deep sleep quality?",
    "Explain common lab report abbreviations",
  ];

  // Simple formatter to format Markdown headers, bold, bullet points, and code blocks
  const renderFormattedText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-base font-bold text-[#1C1B18] mt-3 mb-1">
            {line.replace("### ", "")}
          </h3>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={idx} className="text-lg font-bold text-[#1C1B18] mt-4 mb-2 border-b border-[#E6E1D3] pb-1">
            {line.replace("## ", "")}
          </h2>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-xl font-bold text-[#1C1B18] mt-4 mb-2 border-b border-[#E6E1D3] pb-1">
            {line.replace("# ", "")}
          </h1>
        );
      }
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const content = line.trim().substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-sm text-[#383733] leading-relaxed my-0.5">
            {renderInlineMarkdown(content)}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line.trim())) {
        return (
          <li key={idx} className="ml-4 list-decimal text-sm text-[#383733] leading-relaxed my-0.5">
            {renderInlineMarkdown(line.trim().replace(/^\d+\.\s/, ""))}
          </li>
        );
      }
      if (line.trim() === "---") {
        return <hr key={idx} className="my-3 border-t border-[#E6E1D3]" />;
      }
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="text-sm text-[#383733] leading-relaxed my-1">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  const renderInlineMarkdown = (text: string) => {
    // Regex replace for bold text **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-[#1C1B18]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={`w-full bg-[#FAF9F5] border border-[#E6E1D3] rounded-[32px] overflow-hidden shadow-xs flex flex-col ${
        fullHeight ? "flex-1 min-h-0" : "h-[650px]"
      }`}
    >
      {/* Top Header Bar */}
      <div className="px-6 py-4 bg-[#F2EFE9] border-b border-[#E6E1D3] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#8C6B1F]/10 text-[#8C6B1F] flex items-center justify-center font-bold shadow-xs">
            <span className="material-symbols-outlined text-2xl">smart_toy</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-base text-[#1C1B18]">Hippo AI Assistant</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                Active Agent
              </span>
            </div>
            <p className="text-[11px] text-[#787363] font-sans flex items-center gap-1">
              <span>{agentStatus}</span>
              {activePatientId && (
                <>
                  <span>•</span>
                  <span className="text-[#8C6B1F]">Patient Context Enabled</span>
                </>
              )}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="text-xs font-medium text-[#787363] hover:text-[#1C1B18] px-3 py-1.5 rounded-xl hover:bg-[#EAE6DD] transition-colors flex items-center gap-1.5"
            title="Clear conversation"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      {/* Main Chat Messages Window */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans bg-[#FAF9F5]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
            <div className="w-16 h-16 rounded-3xl bg-[#8C6B1F]/10 text-[#8C6B1F] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">medical_services</span>
            </div>
            <h3 className="font-serif text-xl font-bold text-[#1C1B18] mb-2">Welcome to Hippo Chat</h3>
            <p className="text-xs text-[#787363] leading-relaxed mb-6">
              Ask me clinical questions, request meal plans, interpret medical terms, or analyze your health profile. Powered by the OpenAI Agent SDK.
            </p>

            {/* Quick Starter Pills */}
            <div className="w-full space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#787363] text-left px-1">
                Suggested Questions
              </p>
              <div className="grid grid-cols-1 gap-2">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-left text-xs text-[#383733] bg-[#F2EFE9] hover:bg-[#EAE6DD] border border-[#E6E1D3] rounded-2xl px-4 py-3 transition-all hover:border-[#8C6B1F]/30 flex items-center justify-between group"
                  >
                    <span>{prompt}</span>
                    <span className="material-symbols-outlined text-base text-[#787363] group-hover:text-[#8C6B1F] transition-colors">
                      arrow_forward
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-[#8C6B1F]/10 text-[#8C6B1F] flex items-center justify-center shrink-0 mt-1">
                  <span className="material-symbols-outlined text-lg">smart_toy</span>
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-3xl p-4 text-sm ${
                  msg.role === "user"
                    ? "bg-[#1C1B18] text-white rounded-br-sm shadow-xs"
                    : "bg-[#F2EFE9] border border-[#E6E1D3] text-[#383733] rounded-bl-sm"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div>{renderFormattedText(msg.content)}</div>
                )}
                <div
                  className={`text-[10px] mt-2 ${
                    msg.role === "user" ? "text-neutral-400 text-right" : "text-[#787363]"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-[#1C1B18] text-white flex items-center justify-center shrink-0 mt-1 text-xs font-bold">
                  {(session?.user?.name?.[0] || "U").toUpperCase()}
                </div>
              )}
            </div>
          ))
        )}

        {/* Thinking Indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-[#8C6B1F]/10 text-[#8C6B1F] flex items-center justify-center shrink-0 mt-1">
              <span className="material-symbols-outlined text-lg animate-pulse">smart_toy</span>
            </div>
            <div className="bg-[#F2EFE9] border border-[#E6E1D3] text-[#787363] rounded-3xl rounded-bl-sm p-4 text-xs flex items-center gap-2">
              <span className="animate-spin material-symbols-outlined text-base text-[#8C6B1F]">
                progress_activity
              </span>
              <span>OpenAI Agent is retrieving context & reasoning...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="p-4 bg-[#F2EFE9] border-t border-[#E6E1D3]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2 bg-[#FAF9F5] border border-[#E6E1D3] rounded-2xl p-2 focus-within:border-[#8C6B1F] transition-all"
        >
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Hippo AI a clinical question or request advice..."
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-transparent border-0 resize-none px-3 py-2 text-sm text-[#1C1B18] placeholder-[#787363] focus:outline-none max-h-32 min-h-[40px]"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-[#8C6B1F] hover:bg-[#735718] disabled:opacity-40 text-white flex items-center justify-center transition-colors shrink-0"
            title="Send Message"
          >
            <span className="material-symbols-outlined text-lg">send</span>
          </button>
        </form>
        <p className="text-[10px] text-[#787363] text-center mt-2">
          Hippo AI provides educational & navigational advice. Consult your physician for medical emergencies or prescriptions.
        </p>
      </div>
    </div>
  );
}

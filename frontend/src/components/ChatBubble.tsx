"use client";

import React from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SourceBadge from "./SourceBadge";
import ReasoningSteps from "./ReasoningSteps";
import type { Message } from "@/lib/types";

interface ChatBubbleProps {
  message: Message;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isFarmer = message.role === "farmer";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      id={`chat-msg-${message.id}`}
      className={`flex gap-3 px-4 sm:px-6 py-2.5 transition-all duration-500 ${isFarmer ? "justify-end" : "justify-start"}`}
    >
      {/* AI Avatar */}
      {!isFarmer && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1 shadow-2xs">
          <span className="text-on-primary text-xs font-bold">DK</span>
        </div>
      )}

      <div className={`max-w-[88%] sm:max-w-[80%] ${isFarmer ? "order-first" : ""}`}>
        {/* Deep Reasoning Steps rendered ABOVE the AI message */}
        {!isFarmer && message.reasoningSteps && message.reasoningSteps.length > 0 && (
          <ReasoningSteps steps={message.reasoningSteps} />
        )}

        {/* Image preview if farmer uploaded one */}
        {isFarmer && message.imageUrl && (
          <div className="mb-2 rounded-xl overflow-hidden border border-border bg-muted shadow-xs max-w-xs">
            <img
              src={message.imageUrl}
              alt="Uploaded crop tissue"
              className="w-full h-auto max-h-60 object-cover rounded-xl"
            />
          </div>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 sm:px-5 py-3.5 text-sm leading-relaxed ${
            isFarmer
              ? "bg-farmer-bubble border border-farmer-border rounded-br-md text-foreground shadow-2xs"
              : "bg-ai-bubble border border-ai-border rounded-bl-md text-card-foreground shadow-2xs"
          }`}
        >
          {isFarmer ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="markdown-prose prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ ...props }) => (
                    <div className="my-3 overflow-x-auto rounded-xl border border-border shadow-2xs bg-card">
                      <table className="min-w-full divide-y divide-border text-xs text-left" {...props} />
                    </div>
                  ),
                  thead: ({ ...props }) => (
                    <thead className="bg-muted/80 text-foreground font-bold" {...props} />
                  ),
                  tbody: ({ ...props }) => (
                    <tbody className="divide-y divide-border/60 bg-card/60" {...props} />
                  ),
                  tr: ({ ...props }) => (
                    <tr className="hover:bg-muted/30 transition-colors" {...props} />
                  ),
                  th: ({ ...props }) => (
                    <th className="px-3.5 py-2.5 text-xs font-bold text-foreground uppercase tracking-wider" {...props} />
                  ),
                  td: ({ ...props }) => (
                    <td className="px-3.5 py-2.5 text-xs text-foreground/90 whitespace-normal" {...props} />
                  ),
                  h1: ({ ...props }) => (
                    <h1 className="font-heading text-lg font-bold text-foreground mt-4 mb-2 pb-1 border-b border-border-light" {...props} />
                  ),
                  h2: ({ ...props }) => (
                    <h2 className="font-heading text-base font-bold text-foreground mt-3.5 mb-1.5" {...props} />
                  ),
                  h3: ({ ...props }) => (
                    <h3 className="font-heading text-sm font-semibold text-foreground mt-2.5 mb-1" {...props} />
                  ),
                  p: ({ ...props }) => (
                    <p className="my-1.5 leading-relaxed text-foreground/95" {...props} />
                  ),
                  ul: ({ ...props }) => (
                    <ul className="list-disc pl-5 my-2 space-y-1 text-foreground/90" {...props} />
                  ),
                  ol: ({ ...props }) => (
                    <ol className="list-decimal pl-5 my-2 space-y-1 text-foreground/90" {...props} />
                  ),
                  li: ({ ...props }) => (
                    <li className="leading-relaxed" {...props} />
                  ),
                  strong: ({ ...props }) => (
                    <strong className="font-bold text-foreground" {...props} />
                  ),
                  blockquote: ({ ...props }) => (
                    <blockquote className="border-l-4 border-primary pl-3 my-2.5 italic text-muted-foreground bg-primary/5 py-1 rounded-r-lg" {...props} />
                  ),
                  a: ({ ...props }) => (
                    <a className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />
                  ),
                  hr: () => (
                    <hr className="my-3 border-border-light" />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Source badges */}
          {!isFarmer && message.sources && message.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-border-light">
              {message.sources.map((source, i) => (
                <SourceBadge key={i} label={source.label} color={source.color} />
              ))}
            </div>
          )}
        </div>

        {/* Date */}
        <p
          className={`text-[10px] text-muted-foreground mt-1 ${
            isFarmer ? "text-right" : "text-left"
          } ml-1`}
          suppressHydrationWarning
        >
          {new Date(message.timestamp).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Farmer Avatar */}
      {isFarmer && (
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-1 shadow-2xs">
          <span className="text-on-accent text-xs font-bold">
            {message.role === "farmer" ? "FA" : "AI"}
          </span>
        </div>
      )}
    </motion.div>
  );
}

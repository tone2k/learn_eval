"use client";

import { SearchIcon } from "lucide-react";
import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import type { OurMessage, SearchSource } from "~/types";

const components: Components = {
  p: ({ children }) => <p className="mb-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""} rounded bg-white/10 px-1 py-0.5 text-sm text-accent-light`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg bg-black/30 border border-white/10 p-3 text-sm">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-accent hover:text-accent-light underline transition-colors"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

const Markdown = ({ children }: { children: string }) => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

const Sources = ({ sources }: { sources: SearchSource[] }) => {
  return (
    <div className="mt-3">
      <div className="text-xs text-gray-400 mb-3 font-medium">
        🔍 Found {sources.length} sources • Click to explore
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {sources.map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-lg glass-card p-3 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-accent/10"
          >
            {source.favicon && (
              <img
                src={source.favicon}
                alt=""
                className="mt-0.5 size-4 flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white line-clamp-1">
                {source.title}
              </div>
              <div className="mt-1 text-xs text-gray-400 line-clamp-2">
                {source.snippet}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export const ReasoningSteps = ({
  parts,
}: {
  parts: Array<Extract<OurMessage['parts'][number], { type: 'data-newAction' | 'data-sources' | 'data-clarification' }>>;
}) => {
  const [openStep, setOpenStep] = useState<number | null>(null);

  if (parts.length === 0) return null;

  return (
    <div className="mb-4 w-full">
      <ul className="space-y-2">
        {parts.map((part, index) => {
          const isOpen = openStep === index;
          return (
            <li key={index} className="relative">
              <button
                onClick={() => setOpenStep(isOpen ? null : index)}
                className={`min-w-34 flex w-full flex-shrink-0 items-center rounded-lg px-3 py-2 text-left text-sm transition-all ${
                  isOpen
                    ? "bg-gradient-to-r from-accent/20 to-primary-600/20 border border-accent/40 shadow-md"
                    : "glass-card hover:border-white/20 text-gray-400 hover:text-white"
                }`}
              >
                <span
                  className={`z-10 mr-3 flex size-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isOpen
                      ? "bg-accent text-white shadow-lg shadow-accent/30"
                      : "bg-white/10 text-gray-300 border border-white/20"
                  }`}
                >
                  {part.type === "data-newAction" && part.data.step ? part.data.step : index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>
                      {part.type === "data-newAction" 
                        ? part.data.title 
                        : part.type === "data-sources" 
                          ? `Sources (${part.data.length} found)` 
                          : "Clarification"}
                    </span>
                    {part.type === "data-newAction" && part.data.step && part.data.maxSteps && (
                      <span className="text-xs text-gray-400 ml-2 opacity-75">
                        Step {part.data.step}/{part.data.maxSteps}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              <div className={`${isOpen ? "mt-2" : "hidden"}`}>
                {isOpen && (
                  <div className="px-3 py-2 rounded-lg bg-black/20 border border-white/5">
                    {part.type === "data-newAction" ? (
                      <>
                        <div className="text-sm italic text-gray-300">
                          <Markdown>{part.data.reasoning}</Markdown>
                        </div>
                        {part.data.type === "continue" && (
                          <div className="mt-3 flex flex-col gap-2 text-sm">
                            <div className="flex items-center gap-2 text-primary-400">
                              <SearchIcon className="size-4 animate-pulse" />
                              <span>Expanding search...</span>
                            </div>
                            {part.data.feedback && (
                              <div className="mt-2 border-l-2 border-accent/30 pl-4">
                                <div className="font-medium text-accent-light mb-1">Insight:</div>
                                <div className="text-gray-300">
                                  <Markdown>{part.data.feedback}</Markdown>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : part.type === "data-sources" ? (
                      <Sources sources={part.data} />
                    ) : part.type === "data-clarification" ? (
                      <div className="text-sm">
                        <div className="mb-3 italic text-gray-300">
                          <Markdown>{part.data.reasoning}</Markdown>
                        </div>
                        <div className="font-medium text-amber-400">
                          ℹ️ I need more information to help you effectively.
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}; 
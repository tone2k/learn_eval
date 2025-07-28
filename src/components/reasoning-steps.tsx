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
    <code className={`${className ?? ""} rounded bg-gray-600 px-1 py-0.5 text-sm`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded bg-gray-600 p-2 text-sm">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-400 underline"
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
    <div className="mt-2">
      <div className="text-xs text-gray-500 mb-2">
        Found {sources.length} sources • Click to open
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {sources.map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 rounded border border-gray-700 bg-gray-800 p-2 hover:bg-gray-700 transition-colors"
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
              <div className="text-sm font-medium text-gray-200 line-clamp-1">
                {source.title}
              </div>
              <div className="mt-0.5 text-xs text-gray-400 line-clamp-1">
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
      <ul className="space-y-1">
        {parts.map((part, index) => {
          const isOpen = openStep === index;
          return (
            <li key={index} className="relative">
              <button
                onClick={() => setOpenStep(isOpen ? null : index)}
                className={`min-w-34 flex w-full flex-shrink-0 items-center rounded px-2 py-1 text-left text-sm transition-colors ${
                  isOpen
                    ? "bg-gray-700 text-gray-200"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                }`}
              >
                <span
                  className={`z-10 mr-3 flex size-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-500 text-xs font-bold ${
                    isOpen
                      ? "border-blue-400 text-white"
                      : "bg-gray-800 text-gray-300"
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
                      <span className="text-xs text-gray-500 ml-2">
                        Step {part.data.step}/{part.data.maxSteps}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              <div className={`${isOpen ? "mt-1" : "hidden"}`}>
                {isOpen && (
                  <div className="px-2 py-1">
                    {part.type === "data-newAction" ? (
                      <>
                        <div className="text-sm italic text-gray-400">
                          <Markdown>{part.data.reasoning}</Markdown>
                        </div>
                        {part.data.type === "continue" && (
                          <div className="mt-2 flex flex-col gap-2 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                              <SearchIcon className="size-4" />
                              <span>Continuing search...</span>
                            </div>
                            {part.data.feedback && (
                              <div className="mt-2 border-l-2 border-gray-700 pl-4">
                                <div className="font-medium text-gray-300">Feedback:</div>
                                <Markdown>{part.data.feedback}</Markdown>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : part.type === "data-sources" ? (
                      <Sources sources={part.data} />
                    ) : part.type === "data-clarification" ? (
                      <div className="text-sm text-gray-400">
                        <div className="mb-2 italic">
                          <Markdown>{part.data.reasoning}</Markdown>
                        </div>
                        <div className="font-medium text-orange-400">
                          I need more information to help you effectively.
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
import type { Message } from "@ai-sdk/react";
import ReactMarkdown, { type Components } from "react-markdown";
import type { OurMessageAnnotation } from "~/types";
import { ReasoningSteps } from "./reasoning-steps";

interface ChatMessageProps {
  parts: any[];
  role: string;
  userName: string;
  annotations: OurMessageAnnotation[];
}

const components: Components = {
  // Override default elements with custom styling
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-700 p-4">
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

export const ChatMessage = ({
  parts,
  role,
  userName,
  annotations,
}: ChatMessageProps) => {
  const isAI = role === "assistant";

  // Filter annotations for NEW_ACTION type
  const filteredAnnotations = annotations.filter(
    (annotation) => annotation.type === "NEW_ACTION"
  );

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
          }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>

        {/* Show reasoning steps only for AI messages with annotations */}
        {isAI && filteredAnnotations.length > 0 && (
          <ReasoningSteps annotations={filteredAnnotations} />
        )}

        <div className="prose prose-invert max-w-none">
          {parts && parts.length > 0 ? (
            // Render message parts for tool calls and other structured content
            parts.map((part: any, index: number) => {
              if (part.type === "text") {
                return <Markdown key={index}>{part.text}</Markdown>;
              } else if (part.type === "tool-invocation") {
                return (
                  <div key={index} className="mb-2 rounded bg-gray-700 p-2">
                    <p className="text-sm text-gray-400">
                      🔧 Using tool: {part.toolInvocation.toolName}
                    </p>
                    <pre className="mt-1 text-xs text-gray-500">
                      {JSON.stringify(part.toolInvocation.args, null, 2)}
                    </pre>
                  </div>
                );
              }
              return null;
            })
          ) : (
            // Render empty state for messages without parts
            <p className="text-gray-500">No content</p>
          )}
        </div>
      </div>
    </div>
  );
};

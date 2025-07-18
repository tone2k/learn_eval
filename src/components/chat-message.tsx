import type { Message } from "@ai-sdk/react";
import ReactMarkdown, { type Components } from "react-markdown";

interface ChatMessageProps {
  message: Message;
  userName: string;
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

export const ChatMessage = ({ message, userName }: ChatMessageProps) => {
  const isAI = message.role === "assistant";

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
          }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>

        <div className="prose prose-invert max-w-none">
          {message.parts && message.parts.length > 0 ? (
            // Render message parts for tool calls and other structured content
            message.parts.map((part: any, index: number) => {
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
            // Fallback to content for backwards compatibility
            (() => {
              // Add safety check before passing to Markdown
              const contentToRender = typeof message.content === 'string' 
                ? message.content 
                : JSON.stringify(message.content);
              return <Markdown>{contentToRender}</Markdown>;
            })()
          )}
        </div>
      </div>
    </div>
  );
};

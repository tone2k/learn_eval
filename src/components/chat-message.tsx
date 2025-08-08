import ReactMarkdown, { type Components } from "react-markdown";
import type { OurMessage } from "~/types";
import { ReasoningSteps } from "./reasoning-steps";

interface ChatMessageProps {
  parts: OurMessage['parts'];
  role: string;
  userName: string;
}

const components: Components = {
  // Override default elements with custom styling
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-5">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""} rounded bg-slate-100 px-1 py-0.5 text-sm dark:bg-slate-800`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-slate-100 border border-slate-200 p-4 dark:bg-slate-900 dark:border-slate-800">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-indigo-600 underline hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
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
}: ChatMessageProps) => {
  const isAI = role === "assistant";

  // Extract data parts directly from parts array
  const actionParts = parts.filter((part): part is Extract<typeof part, { type: 'data-newAction' }> => 
    part.type === 'data-newAction'
  );
  
  const sourcesParts = parts.filter((part): part is Extract<typeof part, { type: 'data-sources' }> => 
    part.type === 'data-sources'
  );
  
  const clarificationParts = parts.filter((part): part is Extract<typeof part, { type: 'data-clarification' }> => 
    part.type === 'data-clarification'
  );

  const textParts = parts.filter((part): part is Extract<typeof part, { type: 'data-text' }> => 
    part.type === 'data-text'
  );

  // Find the latest usage data part (if any)
  const usagePart = isAI ? parts.findLast((part): part is Extract<typeof part, { type: 'data-usage' }> => 
    part.type === 'data-usage'
  ) : undefined;

  return (
    <div className="mb-6">
      <div
        className={`rounded-2xl p-4 md:p-5 border ${isAI 
          ? "bg-white/90 border-slate-200 text-slate-800 shadow-sm dark:bg-slate-900/70 dark:border-slate-800 dark:text-slate-100" 
          : "bg-indigo-50 border-indigo-200 text-slate-900 dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-slate-100"
        }`}
      >
        <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {isAI ? "AI" : userName}
        </p>

        {/* Show reasoning steps for AI messages with data parts */}
        {isAI && (actionParts.length > 0 || sourcesParts.length > 0 || clarificationParts.length > 0) && (
          <ReasoningSteps parts={[...actionParts, ...sourcesParts, ...clarificationParts]} />
        )}

        {/* Show text content from data-text parts */}
        {textParts.length > 0 && (
          <div className="prose max-w-none dark:prose-invert">
            {textParts.map((part, index) => (
              <Markdown key={index}>{part.data.content}</Markdown>
            ))}
          </div>
        )}

        {/* Only show main content if there are no clarification parts and no text parts */}
        {clarificationParts.length === 0 && textParts.length === 0 && (
          <div className="prose max-w-none dark:prose-invert">
            {parts && parts.length > 0 ? (
              // Render message parts for tool calls and other structured content
              parts.map((part, index: number) => {
                // Skip rendering data parts that are already shown in reasoning steps
                if (part.type === "data-newAction" || 
                    part.type === "data-sources" || 
                    part.type === "data-clarification" ||
                    part.type === "data-usage" ||
                    part.type === "data-newChatCreated" ||
                    part.type === "data-text") {
                  return null;
                }
                
                if (part.type === "text") {
                  return <Markdown key={index}>{part.text}</Markdown>;
                } else if (part.type === "tool-invocation") {
                  return (
                    <div key={index} className="mb-2 rounded border border-slate-200 bg-slate-50 p-2 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      <p className="text-sm">
                        🔧 Using tool: {part.toolInvocation.toolName}
                      </p>
                      <pre className="mt-1 overflow-auto text-xs">
                        {JSON.stringify(part.toolInvocation.args, null, 2)}
                      </pre>
                    </div>
                  );
                }
                
                return null;
              })
            ) : (
              // Only show empty state for messages without any parts
              isAI && actionParts.length === 0 && sourcesParts.length === 0 && clarificationParts.length === 0 ? (
                <p className="text-slate-600 dark:text-slate-300">No content</p>
              ) : null
            )}
          </div>
        )}

        {/* Show token usage for AI messages */}
        {isAI && usagePart && (
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Tokens used: {usagePart.data.totalTokens.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

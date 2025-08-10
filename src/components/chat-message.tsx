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
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-5 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-5 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="mb-1.5">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""} bg-white/10 px-1.5 py-0.5 rounded text-accent-light font-mono text-sm`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-xl bg-black/40 border border-white/10 p-4 backdrop-blur-sm">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-accent hover:text-accent-light underline underline-offset-2 transition-colors"
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
    <div className="mb-6 message-appear">
      <div
        className={`rounded-xl p-5 transition-all duration-300 ${isAI 
          ? "glass-card border-accent/20 shadow-lg shadow-accent/10" 
          : "bg-white/5 border border-white/10 backdrop-blur-sm"
        }`}
      >
        <p className={`mb-3 text-xs font-medium tracking-wide ${isAI ? "text-accent-light" : "text-gray-400"}`}>
          {isAI ? "AI RESEARCHER" : userName.toUpperCase()}
        </p>

        {/* Show reasoning steps for AI messages with data parts */}
        {isAI && (actionParts.length > 0 || sourcesParts.length > 0 || clarificationParts.length > 0) && (
          <ReasoningSteps parts={[...actionParts, ...sourcesParts, ...clarificationParts]} />
        )}

        {/* Show text content from data-text parts */}
        {textParts.length > 0 && (
          <div className="prose prose-invert max-w-none text-gray-200">
            {textParts.map((part, index) => (
              <Markdown key={index}>{part.data.content}</Markdown>
            ))}
          </div>
        )}

        {/* Only show main content if there are no clarification parts and no text parts */}
        {clarificationParts.length === 0 && textParts.length === 0 && (
          <div className="prose prose-invert max-w-none text-gray-200">
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
                    <div key={index} className="mb-3 rounded-lg bg-primary-900/30 border border-primary-700/30 p-3">
                      <p className="text-sm text-primary-300 font-medium mb-1">
                        ⚡ {part.toolInvocation.toolName}
                      </p>
                      <pre className="text-xs text-gray-400 font-mono">
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
                <p className="text-gray-500 italic">Processing...</p>
              ) : null
            )}
          </div>
        )}

        {/* Show token usage for AI messages */}
        {isAI && usagePart && (
          <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-500">
            <span className="opacity-60">Tokens: {usagePart.data.totalTokens.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

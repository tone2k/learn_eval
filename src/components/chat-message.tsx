import ReactMarkdown, { type Components } from "react-markdown";
import type { OurMessage } from "~/types";
import { ReasoningSteps } from "./reasoning-steps";

interface ChatMessageProps {
  parts: OurMessage['parts'];
  role: string;
  userName: string;
  dataParts?: Array<Extract<OurMessage['parts'][number], { type: 'data-newAction' | 'data-sources' | 'data-clarification' | 'data-usage' }>>;
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
  dataParts = [],
}: ChatMessageProps) => {
  console.log(`🎨 ChatMessage received:`, { 
    role, 
    partsCount: parts?.length, 
    dataPartsCount: dataParts.length,
    dataParts: dataParts.map(p => ({ type: p.type }))
  });
  const isAI = role === "assistant";

  // Use dataParts prop instead of extracting from parts
  const actionParts = dataParts.filter((part): part is Extract<typeof part, { type: 'data-newAction' }> => 
    part.type === 'data-newAction'
  );
  
  const sourcesParts = dataParts.filter((part): part is Extract<typeof part, { type: 'data-sources' }> => 
    part.type === 'data-sources'
  );
  
  const clarificationParts = dataParts.filter((part): part is Extract<typeof part, { type: 'data-clarification' }> => 
    part.type === 'data-clarification'
  );

  // Find the latest usage data part (if any)
  const usagePart = isAI ? dataParts.findLast((part): part is Extract<typeof part, { type: 'data-usage' }> => 
    part.type === 'data-usage'
  ) : undefined;

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
          }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>

        {/* Show reasoning steps for AI messages with data parts */}
        {isAI && (actionParts.length > 0 || sourcesParts.length > 0 || clarificationParts.length > 0) && (
          <ReasoningSteps parts={[...actionParts, ...sourcesParts, ...clarificationParts]} />
        )}

        <div className="prose prose-invert max-w-none">
          {parts && parts.length > 0 ? (
            // Render message parts for tool calls and other structured content
            parts.map((part: any, index: number) => {
              console.log(`🎨 ChatMessage rendering part ${index}:`, { type: part.type, hasText: !!part.text });
              if (part.type === "text") {
                console.log(`🎨 Rendering text part: "${part.text?.substring(0, 50)}..."`);
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

        {/* Show token usage for AI messages */}
        {isAI && usagePart && (
          <div className="mb-2 text-xs text-gray-400">
            Tokens used: {usagePart.data.totalTokens.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

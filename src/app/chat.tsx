"use client";

import { useChat } from "@ai-sdk/react";
import type { Message } from "ai";
import { Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { StickToBottom } from "use-stick-to-bottom";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import type { OurMessageAnnotation } from "~/types";
import { isNewChatCreated } from "~/utils";

interface ChatProps {
  userName: string;
  chatId: string | null;
  isNewChat: boolean;
}


export const ChatPage = ({ userName, chatId, isNewChat }: ChatProps) => {
  console.log('🔄 ChatPage render:', { chatId, isNewChat, userName });
  
  const router = useRouter();
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(!isNewChat);
  
  // Generate a stable chat ID for new chats that persists across re-renders
  const newChatIdRef = useRef<string | null>(null);
  if (isNewChat && !newChatIdRef.current) {
    newChatIdRef.current = crypto.randomUUID();
    console.log('🆕 Generated new chat ID:', newChatIdRef.current);
  }
  
  // Use the stable chat ID
  const effectiveChatId = chatId || newChatIdRef.current;
  
  // Track if we're in the process of creating a chat to prevent duplicates
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // Load existing messages and handle chat switching
  useEffect(() => {
    if (isNewChat) {
      setInitialMessages([]);
      setIsLoadingChat(false);
      return;
    }

    if (!chatId) {
      setInitialMessages([]);
      setIsLoadingChat(false);
      return;
    }

    const loadExistingMessages = async () => {
      try {
        setIsLoadingChat(true);
        const response = await fetch(`/api/chat?id=${chatId}`);
        if (response.ok) {
          const data = await response.json();
          console.log("🔍 Frontend: Received messages from API:", data.messages);
          
          if (data.messages) {
            data.messages.forEach((msg: any, index: number) => {
              console.log(`🔍 Frontend: Message ${index}:`, {
                id: msg.id,
                role: msg.role,
                contentType: typeof msg.content,
                content: msg.content,
              });
            });
          }
          
          setInitialMessages(data.messages || []);
        } else {
          console.error("Failed to load chat messages");
          setInitialMessages([]);
        }
      } catch (error) {
        console.error("Error loading chat messages:", error);
        setInitialMessages([]);
      } finally {
        setIsLoadingChat(false);
      }
    };

    loadExistingMessages();
  }, [chatId, isNewChat]);

  const { messages, input, handleInputChange, handleSubmit, status, stop, data, error, setMessages } = useChat({
    api: "/api/chat",
    id: effectiveChatId || undefined,
    initialMessages,
    body: {
      chatId: effectiveChatId!, // Use the stable chat ID
      isNewChat: isNewChat && !isCreatingChat, // Only treat as new if we haven't started creating
    },
    onError: (error) => {
      console.error("🔥 useChat ERROR:", error);
      console.error("🔥 Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    },
    onResponse: (response) => {
      console.log("📡 useChat RESPONSE received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
    },
    onFinish: (message, { finishReason }) => {
      // Navigate to new chat URL when chat is created
      if (isNewChat && !isCreatingChat && data && data.length > 0) {
        const lastDataItem = data[data.length - 1];
        if (isNewChatCreated(lastDataItem)) {
          setIsCreatingChat(true); // Mark that we're creating the chat
          console.log('🚀 Navigating to new chat:', lastDataItem.chatId);
          // Clear the ref so a new ID is generated for the next new chat
          newChatIdRef.current = null;
          // Use router.push to navigate to the new chat
          router.push(`?chatId=${lastDataItem.chatId}`);
        }
      }
    }
  });

  const isLoading = status === "streaming";

  // Handle chat switching and error logging
  useEffect(() => {
    // Clear messages when switching to new chat
    if (isNewChat && setMessages) {
      console.log('🧹 Clearing messages for new chat');
      setMessages([]);
      setIsCreatingChat(false); // Reset creating flag
    }
    
    // Log errors
    if (error) {
      console.error('🔥 useChat Error:', error.message);
    }
  }, [isNewChat, setMessages, error]);
  
  // Reset the new chat ID ref when chatId changes (switching between chats)
  useEffect(() => {
    if (chatId) {
      newChatIdRef.current = null;
    }
  }, [chatId]);

  // Simple form submit handler with loading protection
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      handleSubmit(e);
    }
  };



  if (isLoadingChat) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-[65ch] flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500">
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500">Loading conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <StickToBottom
        className="flex flex-1 flex-col [&>div]:scrollbar-thin [&>div]:scrollbar-track-gray-800 [&>div]:scrollbar-thumb-gray-600 [&>div]:hover:scrollbar-thumb-gray-500"
        resize="instant"
        initial="instant"
      >
        <StickToBottom.Content className="mx-auto w-full max-w-[65ch] flex-1 flex flex-col gap-4 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center py-32">
              <p className="text-gray-500">Start a conversation...</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  parts={message.parts ?? []}
                  role={message.role}
                  userName={userName}
                  annotations={((message as any).annotations ?? []) as OurMessageAnnotation[]}
                />
              ))}
            </>
          )}
        </StickToBottom.Content>

        <div className="border-t border-gray-700">
          <form
            onSubmit={handleFormSubmit}
            className="mx-auto max-w-[65ch] p-4"
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Say something..."
                autoFocus
                aria-label="Chat input"
                className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-gray-200 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                disabled={isLoading || isLoadingChat}
              />
              <button
                type={isLoading ? "button" : "submit"}
                onClick={isLoading ? stop : undefined}
                disabled={(!input.trim() && !isLoading) || isLoadingChat}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:hover:bg-gray-700"
              >
                {isLoading ? <Square className="size-4" /> : "Send"}
              </button>
            </div>
          </form>
        </div>
      </StickToBottom>

      <SignInModal isOpen={false} onClose={() => undefined} />
    </>
  );
};

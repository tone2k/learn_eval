"use client";

import { useChat } from "@ai-sdk/react";
import type { Message } from "ai";
import { Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import { isNewChatCreated } from "~/utils";

interface ChatProps {
  userName: string;
  chatId?: string;
}

export const ChatPage = ({ userName, chatId }: ChatProps) => {
  const router = useRouter();
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(!!chatId);

  // Load existing messages when chatId is provided
  useEffect(() => {
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
  }, [chatId]);

  const { messages, input, handleInputChange, handleSubmit, status, stop, data } = useChat({
    api: "/api/chat",
    initialMessages,
    body: {
      chatId,
    },
  });

  const isLoading = status === "streaming";

  useEffect(() => {
    const lastDataItem = data?.[data.length - 1];

    if (
      lastDataItem &&
      isNewChatCreated(lastDataItem)
    ) {
      router.push(`?id=${lastDataItem.chatId}`);
    }
  }, [data, router]);

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
      <div className="flex flex-1 flex-col">
        <div
          className="mx-auto w-full max-w-[65ch] flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500"
          role="log"
          aria-label="Chat messages"
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-500">Start a conversation...</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                userName={userName}
              />
            ))
          )}
        </div>

        <div className="border-t border-gray-700">
          <form
            onSubmit={handleSubmit}
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
                type="button"
                onClick={isLoading ? stop : handleSubmit}
                disabled={(isLoading && !input.trim()) || isLoadingChat}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:hover:bg-gray-700"
              >
                {isLoading ? <Square className="size-4" /> : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SignInModal isOpen={false} onClose={() => undefined} />
    </>
  );
};

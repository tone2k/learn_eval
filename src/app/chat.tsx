"use client";

import { useChat } from "@ai-sdk/react";
import type { Message } from "ai";
import { Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StickToBottom } from "use-stick-to-bottom";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import { isNewChatCreated } from "~/utils";

interface ChatProps {
  userName: string;
  chatId: string;
  isNewChat: boolean;
}


export const ChatPage = ({ userName, chatId, isNewChat }: ChatProps) => {
  const router = useRouter();
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(!isNewChat);

  // Load existing messages when it's not a new chat
  useEffect(() => {
    if (isNewChat) {
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

  const { messages, input, handleInputChange, handleSubmit, status, stop, data } = useChat({
    api: "/api/chat",
    initialMessages,
    body: {
      chatId,
      isNewChat,
    },
  });

  const isLoading = status === "streaming";

  // Log when messages change
  useEffect(() => {
    console.log('🔍 Main ChatPage - messages changed:', {
      chatId,
      messagesLength: messages.length,
      isNewChat,
      isLoading,
      timestamp: new Date().toISOString()
    });
  }, [messages, chatId, isNewChat, isLoading]);

  useEffect(() => {
    const lastDataItem = data?.[data.length - 1];

    if (
      lastDataItem &&
      isNewChatCreated(lastDataItem)
    ) {
      router.push(`?chatId=${lastDataItem.chatId}`);
    }
  }, [data, router, isNewChat]);

  // Log component mounting - must be before any conditional returns
  useEffect(() => {
    console.log('🔍 ChatPage component mounting/updating with chatId:', chatId);
    return () => {
      console.log('🔍 ChatPage component unmounting for chatId:', chatId);
    };
  }, [chatId]);

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
        key={chatId}
        className="flex flex-1 flex-col [&>div]:scrollbar-thin [&>div]:scrollbar-track-gray-800 [&>div]:scrollbar-thumb-gray-600 [&>div]:hover:scrollbar-thumb-gray-500"
        resize="smooth"
        initial="smooth"
      >
        <StickToBottom.Content className="mx-auto w-full max-w-[65ch] flex-1 flex flex-col gap-4 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center py-32">
              <p className="text-gray-500">Start a conversation...</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  userName={userName}
                />
              ))}
            </>
          )}
        </StickToBottom.Content>

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
      </StickToBottom>

      <SignInModal isOpen={false} onClose={() => undefined} />
    </>
  );
};

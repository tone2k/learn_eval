"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import type { OurMessage } from "~/types";

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
  chatId: string | undefined;
  initialMessages: OurMessage[];
}

export const ChatPage = ({
  userName,
  isAuthenticated,
  chatId,
  initialMessages,
}: ChatProps) => {
  const [showSignInModal, setShowSignInModal] = useState(false);
  const router = useRouter();
  const { messages, status, sendMessage } = useChat<OurMessage>({
    transport: new DefaultChatTransport({
      body: {
        chatId,
      },
    }),
    messages: initialMessages,
    onData: (dataPart) => {
      if (dataPart.type === "data-newChatCreated") {
        const data = dataPart.data as { chatId: string };
        router.push(`?chatId=${data.chatId}`);
      }
    },
  });

  const [input, setInput] = useState("");

  const isLoading = status === "streaming";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    try {
      sendMessage({
        text: input,
      });
      setInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };


  return (
    <>
      <div className="flex flex-1 flex-col">
        <div
          className="mx-auto w-full max-w-[65ch] flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-pink-200 scrollbar-thumb-pink-400 hover:scrollbar-thumb-pink-500"
          role="log"
          aria-label="Chat messages"
        >
          {messages.map((message, index) => {
            return (
              <ChatMessage
                key={message.id || `message-${index}`}
                parts={message.parts ?? []}
                role={message.role}
                userName={userName}
              />
            );
          })}
        </div>

        <div className="border-t border-pink-200">
          <form onSubmit={handleSubmit} className="mx-auto max-w-[65ch] p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Say something..."
                autoFocus
                aria-label="Chat input"
                className="flex-1 rounded border border-pink-300 bg-white p-2 text-gray-900 placeholder-gray-500 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="rounded bg-pink-500 px-4 py-2 text-white hover:bg-pink-600 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-50 disabled:hover:bg-pink-500"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  );
};

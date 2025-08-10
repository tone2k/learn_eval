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
          className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto p-6 scrollbar-custom"
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

        <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="mx-auto max-w-4xl p-6">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything... I'll search deeply for answers"
                autoFocus
                aria-label="Chat input"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-400 backdrop-blur-sm transition-all focus:border-accent/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="button-gradient rounded-xl px-6 py-3 font-medium text-white shadow-lg transition-all hover:shadow-accent/30 focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
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

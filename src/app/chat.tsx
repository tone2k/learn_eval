"use client";

import { useChat } from "@ai-sdk/react";
import { Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StickToBottom } from "use-stick-to-bottom";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import type { OurMessage } from "~/types";

interface ChatProps {
  userName: string;
  chatId: string | null;
  isNewChat: boolean;
}


export const ChatPage = ({ userName, chatId, isNewChat }: ChatProps) => {
  console.log('🔄 ChatPage render:', { chatId, isNewChat, userName });
  
  const router = useRouter();
  const [initialMessages, setInitialMessages] = useState<OurMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(!isNewChat);
  
  // For new chats, let the backend generate the chat ID
  // We'll track when a new chat gets created to update the URL
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId);
  console.log('🔍 Frontend state:', { currentChatId, chatId, isNewChat });
  
  // Track if we're in the process of creating a chat to prevent duplicates
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // Load existing messages and handle chat switching
  useEffect(() => {
    console.log('🔎 EFFECT 1 - Message loading triggered:', { 
      isNewChat, 
      chatId, 
      currentChatId,
      timestamp: new Date().toISOString()
    });
    
    if (isNewChat) {
      console.log('🔎 EFFECT 1 - New chat detected, clearing');
      setInitialMessages([]);
      setIsLoadingChat(false);
      return;
    }

    if (!chatId) {
      console.log('🔎 EFFECT 1 - No chatId, clearing');
      setInitialMessages([]);
      setIsLoadingChat(false);
      return;
    }

    console.log('🔎 EFFECT 1 - About to load messages for chatId:', chatId);
    
    const loadExistingMessages = async () => {
      try {
        console.log('🔎 EFFECT 1 - Starting API call for chatId:', chatId);
        setIsLoadingChat(true);
        const response = await fetch(`/api/chat?id=${chatId}`);
        console.log('🔎 EFFECT 1 - API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json() as { messages?: OurMessage[] };
          console.log("🔎 EFFECT 1 - Success! Received", data.messages?.length || 0, 'messages');
          
          setInitialMessages(data.messages ?? []);
          console.log('🔎 EFFECT 1 - Set initialMessages to', data.messages?.length || 0, 'messages');
        } else {
          console.error("🔎 EFFECT 1 - Failed to load, status:", response.status);
          setInitialMessages([]);
        }
      } catch (error) {
        console.error("🔎 EFFECT 1 - Error:", error);
        setInitialMessages([]);
      } finally {
        setIsLoadingChat(false);
        console.log('🔎 EFFECT 1 - Finished loading');
      }
    };

    loadExistingMessages().catch(console.error);
  }, [chatId, isNewChat, currentChatId]);

  // Manual input state for v5
  const [input, setInput] = useState("");

  // Log useChat configuration
  const useChatConfig = {
    ...(currentChatId ? { id: currentChatId } : {}),
    api: currentChatId ? `/api/chat?chatId=${currentChatId}` : '/api/chat',
    messages: initialMessages,
  };
  console.log('🔧 useChat config:', useChatConfig);
  
  const { messages, sendMessage, status, stop, error, setMessages } = useChat<OurMessage>({
    ...useChatConfig,
    onError: (error) => {
      console.error("🔥 useChat ERROR:", error);
      console.error("🔥 Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    },
    onFinish: (message) => {
      console.log("✅ useChat finished with message:", message);
    },
    onData: (data) => {
      console.log('📡 Frontend received data:', data);
      // Handle data parts in real-time
      if (data.type === "data-newChatCreated") {
        console.log('🚀 New chat created:', data.data.chatId);
        if (isNewChat && !isCreatingChat) {
          setIsCreatingChat(true); // Mark that we're creating the chat
          setCurrentChatId(data.data.chatId);
          console.log('🔄 Updated currentChatId to:', data.data.chatId);
          // Use router.push to navigate to the new chat
          router.push(`?chatId=${data.data.chatId}`);
        }
      }
    },
  });
  
  // Sync initialMessages with useChat when they change (after useChat is defined)
  useEffect(() => {
    console.log('🔎 EFFECT 2 - Sync check:', {
      initialMessagesLength: initialMessages.length,
      useChatMessagesLength: messages.length,
      hasSetMessages: !!setMessages,
      timestamp: new Date().toISOString()
    });
    
    if (initialMessages.length > 0) {
      console.log('🔎 EFFECT 2 - Have initialMessages, checking sync...');
      
      if (setMessages && messages.length === 0) {
        console.log('🔎 EFFECT 2 - useChat messages empty, syncing now!');
        setMessages(initialMessages);
      } else if (setMessages && messages.length !== initialMessages.length) {
        console.log('🔎 EFFECT 2 - Length mismatch, syncing now!');
        setMessages(initialMessages);
      } else {
        console.log('🔎 EFFECT 2 - No sync needed');
      }
    } else {
      console.log('🔎 EFFECT 2 - No initialMessages to sync');
    }
  }, [initialMessages, messages, setMessages]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      console.log('📤 Sending message with currentChatId:', currentChatId);
      sendMessage({
        text: input,
      });
      setInput("");
    }
  };

  const isLoading = status === "streaming";

  // Handle chat switching and error logging
  useEffect(() => {
    console.log('🔄 Chat switching effect:', { chatId, currentChatId, isNewChat });
    
    // Update current chat ID when switching chats
    setCurrentChatId(chatId);
    
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
  }, [chatId, isNewChat, setMessages, error]);

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
            <p className="text-gray-500">Loading your research session...</p>
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
              <p className="text-gray-500">Ask me anything - I&apos;ll research it for you...</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id || `message-${index}`}
                  parts={message.parts ?? []}
                  role={message.role}
                  userName={userName}
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
                onChange={(e) => setInput(e.target.value)}
                placeholder="What would you like to research?"
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

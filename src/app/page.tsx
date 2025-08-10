import Link from "next/link";
import { auth } from "~/server/auth/index.ts";
import { getChats, getChat } from "~/server/db/queries";
import { AppHeader } from "../components/app-header.tsx";
import { AuthButton } from "../components/auth-button.tsx";
import { ChatPage } from "./chat.tsx";
import { NewChatButton } from "../components/new-chat-button.tsx";
import { DeleteChatButton } from "../components/delete-chat-button.tsx";
import type { OurMessage, DatabaseMessage } from "~/types";

// Helper function to transform database message format to AI SDK format
function transformDatabaseMessageToAISDK(msg: DatabaseMessage): OurMessage {
  // In AI SDK v5, messages use parts instead of content
  // If we have stored parts, use them; otherwise convert content to text part
  let parts: Array<{ type: string; text?: string; [key: string]: unknown }> = [];
  
  if (msg.parts && Array.isArray(msg.parts)) {
    parts = msg.parts;
  } else if (msg.content) {
    // Convert legacy content to text part
    const contentText = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    parts = [{ type: 'text', text: contentText }];
  }

  return {
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    parts: parts as OurMessage['parts'],
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ chatId?: string }>;
}) {
  const session = await auth();
  const { chatId: id } = await searchParams;
  const userName = session?.user?.name ?? "Guest";
  const isAuthenticated = !!session?.user;
  
  // Fetch chats for the authenticated user
  const chats = isAuthenticated && session.user?.id 
    ? await getChats(session.user.id) 
    : [];

  // Use chatId from URL
  const chatIdFromUrl = id;
  const activeChatId = chatIdFromUrl; // Use the actual chatId from URL for highlighting
  
  // Load initial messages for existing chats
  let initialMessages: OurMessage[] = [];
  if (chatIdFromUrl && isAuthenticated && session.user?.id) {
    const existingChat = await getChat({ chatId: chatIdFromUrl, userId: session.user.id });
    if (existingChat?.messages) {
      initialMessages = existingChat.messages.map((msg) => 
        transformDatabaseMessageToAISDK(msg as DatabaseMessage)
      );
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-primary-950">
      {/* Sidebar */}
      <div className="flex w-72 flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <AppHeader showSubtitle={false} />
            {isAuthenticated && <NewChatButton />}
          </div>
          <p className="text-xs text-gray-400 ml-12 font-light tracking-wide">Advanced AI Research</p>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4 scrollbar-custom">
          {chats.length > 0 ? (
            chats.map((chat) => (
              <div key={chat.id} className="group">
                <div
                  className={`flex items-center justify-between rounded-xl p-3.5 text-left text-sm transition-all duration-200 ${
                    chat.id === activeChatId
                      ? "bg-gradient-to-r from-accent/20 to-primary-600/20 border border-accent/40 shadow-lg shadow-accent/20"
                      : "glass-card glass-card-hover text-gray-300 hover:text-white"
                  }`}
                >
                  <Link
                    href={`/?chatId=${chat.id}`}
                    className="flex-1 truncate focus:outline-none focus:ring-2 focus:ring-accent rounded-lg transition-colors"
                  >
                    {chat.title}
                  </Link>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <DeleteChatButton 
                      chatId={chat.id} 
                      isActiveChatId={chat.id === activeChatId}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              {isAuthenticated
                ? "No research sessions yet. Start your deep investigation."
                : "Sign in to begin researching"}
            </p>
          )}
        </div>
        <div className="p-4 border-t border-white/10">
          <AuthButton
            isAuthenticated={isAuthenticated}
            userImage={session?.user?.image}
          />
        </div>
      </div>

      <ChatPage
        userName={userName}
        isAuthenticated={isAuthenticated}
        chatId={chatIdFromUrl}
        initialMessages={initialMessages}
      />
    </div>
  );
}

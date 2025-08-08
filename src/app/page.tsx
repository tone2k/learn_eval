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
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="flex w-72 flex-col border-r border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <AppHeader showSubtitle={false} />
            {isAuthenticated && <NewChatButton />}
          </div>
          <p className="text-xs text-slate-500 mt-2 ml-11 font-medium">Dig for the truth</p>
        </div>
        <div className="-mt-1 flex-1 space-y-2 overflow-y-auto px-3 pt-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400 dark:scrollbar-thumb-slate-600 dark:hover:scrollbar-thumb-slate-500">
          {chats.length > 0 ? (
            chats.map((chat) => (
              <div key={chat.id} className="group">
                <div
                  className={`flex items-center justify-between rounded-lg p-2 text-left text-sm border transition-colors ${
                    chat.id === activeChatId
                      ? "bg-indigo-50 border-indigo-200 text-slate-900 dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-slate-100"
                      : "hover:bg-slate-50 bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800"
                  }`}
                >
                  <Link
                    href={`/?chatId=${chat.id}`}
                    className="flex-1 truncate focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
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
            <p className="text-sm text-slate-600 dark:text-slate-400 px-2">
              {isAuthenticated
                ? "No research threads yet. Start digging for the real story!"
                : "Sign in to get the inside scoop"}
            </p>
          )}
        </div>
        <div className="p-4">
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

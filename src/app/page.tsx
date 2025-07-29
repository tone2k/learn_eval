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
    <div className="flex h-screen bg-pink-50">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-r border-pink-200 bg-pink-100">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <AppHeader showSubtitle={false} />
            {isAuthenticated && <NewChatButton />}
          </div>
          <p className="text-xs text-navy-900 mt-2 ml-11 font-medium">Dig for the truth</p>
        </div>
        <div className="-mt-1 flex-1 space-y-2 overflow-y-auto px-4 pt-1 scrollbar-thin scrollbar-track-pink-200 scrollbar-thumb-pink-400">
          {chats.length > 0 ? (
            chats.map((chat) => (
              <div key={chat.id} className="group">
                <div
                  className={`flex items-center justify-between rounded-lg p-3 text-left text-sm text-navy-900 border transition-colors ${
                    chat.id === activeChatId
                      ? "bg-pink-200 border-pink-500"
                      : "hover:bg-pink-50 bg-white border-pink-200 hover:border-pink-300"
                  }`}
                >
                  <Link
                    href={`/?chatId=${chat.id}`}
                    className="flex-1 focus:outline-none focus:ring-2 focus:ring-pink-500 rounded"
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
            <p className="text-sm text-navy-900">
              {isAuthenticated
                ? "No tea to spill yet. Start digging for the real story!"
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

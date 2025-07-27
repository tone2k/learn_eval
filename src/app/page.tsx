import Link from "next/link";
import { auth } from "~/server/auth/index.ts";
import { getChats } from "~/server/db/queries";
import { AuthButton } from "../components/auth-button.tsx";
import { ChatPage } from "./chat.tsx";
import { NewChatButton } from "../components/new-chat-button.tsx";

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

  // Use chatId from URL, null for new chats
  const chatIdFromUrl = id;
  const activeChatId = chatIdFromUrl; // Use the actual chatId from URL for highlighting
  const chatId = chatIdFromUrl ?? null;
  const isNewChat = !chatIdFromUrl;

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-r border-gray-700 bg-gray-900">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400">Research Sessions</h2>
            {isAuthenticated && <NewChatButton />}
          </div>
        </div>
        <div className="-mt-1 flex-1 space-y-2 overflow-y-auto px-4 pt-1 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
          {chats.length > 0 ? (
            chats.map((chat) => (
              <div key={chat.id} className="flex items-center gap-2">
                <Link
                  href={`/?chatId=${chat.id}`}
                  className={`flex-1 rounded-lg p-3 text-left text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    chat.id === activeChatId
                      ? "bg-gray-700"
                      : "hover:bg-gray-750 bg-gray-800"
                  }`}
                >
                  {chat.title}
                </Link>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              {isAuthenticated
                ? "No research sessions yet. Start your first query!"
                : "Sign in to start researching"}
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
        chatId={chatId}
        isNewChat={isNewChat}
      />
    </div>
  );
}

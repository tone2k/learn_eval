import type { Message } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { chats, messages } from "./schema";

export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: Message[];
}) => {
  const { userId, chatId, title, messages: messageList } = opts;

  // Start a transaction to ensure data consistency
  return await db.transaction(async (tx) => {
    // Check if chat exists and belongs to the user within the transaction
    const existingChat = await tx
      .select()
      .from(chats)
      .where(eq(chats.id, chatId))
      .limit(1);

    if (existingChat.length > 0 && existingChat[0]?.userId !== userId) {
      throw new Error("Chat does not belong to the logged in user");
    }

    // Create or update the chat
    if (existingChat.length === 0) {
      // Create new chat - use onConflictDoNothing to handle race conditions
      await tx.insert(chats)
        .values({
          id: chatId,
          title,
          userId,
        })
        .onConflictDoNothing(); // Prevents duplicate key errors
    } else {
      // Update existing chat only if title changed
      if (existingChat[0]?.title !== title) {
        await tx
          .update(chats)
          .set({
            title,
            updatedAt: new Date(),
          })
          .where(eq(chats.id, chatId));
      }
    }

    // For message updates, only replace if there are actual changes
    // This helps prevent unnecessary deletions
    if (messageList.length > 0) {
      // Delete existing messages
      await tx.delete(messages).where(eq(messages.chatId, chatId));
      
      // Insert new messages
      const messageRows = messageList.map((message, index) => ({
        id: message.id,
        chatId,
        role: message.role,
        content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
        parts: message.parts,
        order: index,
      }));

      await tx.insert(messages).values(messageRows);
    }

    return chatId;
  });
};

export const getChat = async (chatId: string, userId: string) => {
  const chat = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);

  if (chat.length === 0) {
    return null;
  }

  const chatMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.order);

  return {
    ...chat[0],
    messages: chatMessages.map(msg => ({
      id: msg.id,
      role: msg.role as "user" | "assistant" | "system",
      content: msg.parts || msg.content,
      createdAt: msg.createdAt,
    })),
  };
};

export const getChats = async (userId: string) => {
  return await db
    .select({
      id: chats.id,
      title: chats.title,
      userId: chats.userId,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));
}; 
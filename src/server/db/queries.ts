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

  // Check if chat exists and belongs to the user
  const existingChat = await db
    .select()
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  if (existingChat.length > 0 && existingChat[0]?.userId !== userId) {
    throw new Error("Chat does not belong to the logged in user");
  }

  // Start a transaction to ensure data consistency
  return await db.transaction(async (tx) => {
    // Create or update the chat
    if (existingChat.length === 0) {
      // Create new chat
      await tx.insert(chats).values({
        id: chatId,
        title,
        userId,
      });
    } else {
      // Update existing chat
      await tx
        .update(chats)
        .set({
          title,
          updatedAt: new Date(),
        })
        .where(eq(chats.id, chatId));
    }

    // Delete existing messages
    await tx.delete(messages).where(eq(messages.chatId, chatId));

    // Insert new messages
    if (messageList.length > 0) {
      const messageRows = messageList.map((message, index) => ({
        id: message.id,
        chatId,
        role: message.role,
        content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
        parts: message.content,
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
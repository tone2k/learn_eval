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
  const { userId, chatId, title, messages: newMessages } = opts;

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
    if (newMessages.length > 0) {
      // Delete existing messages
      await tx.delete(messages).where(eq(messages.chatId, chatId));
      
      // Insert all messages
      await tx.insert(messages).values(
        newMessages.map((message, index) => ({
          id: crypto.randomUUID(),
          chatId,
          role: message.role,
          parts: message.parts,
          annotations: (message as any).annotations,
          order: index,
        })),
      );
    }

    return { id: chatId };
  });
};

export const getChat = async (opts: { userId: string; chatId: string }) => {
  const { userId, chatId } = opts;

  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.order)],
      },
    },
  });

  if (!chat) {
    return null;
  }

  return {
    ...chat,
    messages: chat.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.parts,
      annotations: message.annotations,
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
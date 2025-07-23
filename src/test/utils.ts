import { type Message } from "ai";
import { db } from "~/server/db";
import { chats, messages } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export interface TestUser {
  id: string;
  name: string;
  email: string;
}

export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: overrides.id ?? `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: overrides.name ?? "Test User",
  email: overrides.email ?? "test@example.com",
});

export const createTestMessage = (content: string, role: "user" | "assistant" = "user"): Message => ({
  id: crypto.randomUUID(),
  role,
  content,
  createdAt: new Date(),
});

export const createTestChat = async (userId: string, chatId: string, title?: string) => {
  await db.insert(chats).values({
    id: chatId,
    title: title ?? "Test Chat",
    userId,
  });
};

export const createTestMessages = async (chatId: string, messagesData: Array<{ role: "user" | "assistant"; content: string }>) => {
  await db.insert(messages).values(
    messagesData.map((msg, index) => ({
      id: crypto.randomUUID(),
      chatId,
      role: msg.role,
      parts: msg.content,
      order: index,
    }))
  );
};

export const cleanupTestData = async (chatId: string) => {
  await db.delete(messages).where(eq(messages.chatId, chatId));
  await db.delete(chats).where(eq(chats.id, chatId));
};

export const mockSession = (user?: TestUser) => ({
  user: user ?? createTestUser(),
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
});

export const mockRequest = (method: "GET" | "POST", url: string, body?: any): Request => {
  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new Request(url, requestInit);
};

export const mockResponse = (status: number, body?: any): Response => {
  return new Response(body ? JSON.stringify(body) : undefined, {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
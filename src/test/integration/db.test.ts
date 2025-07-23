import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateChatTitle, getChat, getChats, upsertChat } from "~/server/db/queries";
import { createTestUser, createTestMessage, cleanupTestData } from "~/test/utils";

describe("Database Queries Integration Tests", () => {
  const testUser = createTestUser();
  const testChatId = "test-chat-id";

  beforeEach(async () => {
    // Clean up any existing test data
    await cleanupTestData(testChatId);
  });

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData(testChatId);
  });

  describe("upsertChat", () => {
    it("should create a new chat with messages", async () => {
      const messages = [
        createTestMessage("Hello, how are you?"),
        createTestMessage("I'm doing well, thank you!", "assistant"),
      ];

      const result = await upsertChat({
        userId: testUser.id,
        chatId: testChatId,
        title: "Test Chat",
        messages,
      });

      expect(result).toEqual({ id: testChatId });

      // Verify the chat was created
      const chat = await getChat({ userId: testUser.id, chatId: testChatId });
      expect(chat).toBeTruthy();
      expect(chat?.title).toBe("Test Chat");
      expect(chat?.messages).toHaveLength(2);
      expect(chat?.messages[0].content).toBe("Hello, how are you?");
      expect(chat?.messages[1].content).toBe("I'm doing well, thank you!");
    });

    it("should update an existing chat with new messages", async () => {
      // Create initial chat
      const initialMessages = [createTestMessage("Initial message")];
      await upsertChat({
        userId: testUser.id,
        chatId: testChatId,
        title: "Initial Chat",
        messages: initialMessages,
      });

      // Update with new messages
      const updatedMessages = [
        createTestMessage("Initial message"),
        createTestMessage("New message"),
        createTestMessage("Response", "assistant"),
      ];

      const result = await upsertChat({
        userId: testUser.id,
        chatId: testChatId,
        title: "Updated Chat",
        messages: updatedMessages,
      });

      expect(result).toEqual({ id: testChatId });

      // Verify the chat was updated
      const chat = await getChat({ userId: testUser.id, chatId: testChatId });
      expect(chat).toBeTruthy();
      expect(chat?.title).toBe("Updated Chat");
      expect(chat?.messages).toHaveLength(3);
    });

    it("should not allow updating chat that belongs to different user", async () => {
      // Create chat for one user
      await upsertChat({
        userId: testUser.id,
        chatId: testChatId,
        title: "Test Chat",
        messages: [createTestMessage("Hello")],
      });

      // Try to update with different user
      const differentUser = { ...testUser, id: "different-user-id" };
      
      await expect(
        upsertChat({
          userId: differentUser.id,
          chatId: testChatId,
          title: "Hacked Chat",
          messages: [createTestMessage("Hacked")],
        })
      ).rejects.toThrow("Chat does not belong to the logged in user");
    });

    it("should handle empty messages array", async () => {
      const result = await upsertChat({
        userId: testUser.id,
        chatId: testChatId,
        title: "Empty Chat",
        messages: [],
      });

      expect(result).toEqual({ id: testChatId });

      const chat = await getChat({ userId: testUser.id, chatId: testChatId });
      expect(chat).toBeTruthy();
      expect(chat?.messages).toHaveLength(0);
    });
  });

  describe("getChat", () => {
    it("should retrieve chat with messages", async () => {
      const messages = [
        createTestMessage("Question"),
        createTestMessage("Answer", "assistant"),
      ];

      await upsertChat({
        userId: testUser.id,
        chatId: testChatId,
        title: "Test Chat",
        messages,
      });

      const chat = await getChat({ userId: testUser.id, chatId: testChatId });

      expect(chat).toBeTruthy();
      expect(chat?.id).toBe(testChatId);
      expect(chat?.title).toBe("Test Chat");
      expect(chat?.userId).toBe(testUser.id);
      expect(chat?.messages).toHaveLength(2);
      expect(chat?.messages[0].role).toBe("user");
      expect(chat?.messages[1].role).toBe("assistant");
    });

    it("should return null for non-existent chat", async () => {
      const chat = await getChat({ userId: testUser.id, chatId: "non-existent" });
      expect(chat).toBeNull();
    });

    it("should return null for chat belonging to different user", async () => {
      // Create chat for one user
      await upsertChat({
        userId: testUser.id,
        chatId: testChatId,
        title: "Test Chat",
        messages: [createTestMessage("Hello")],
      });

      // Try to get with different user
      const differentUser = { ...testUser, id: "different-user-id" };
      const chat = await getChat({ userId: differentUser.id, chatId: testChatId });
      expect(chat).toBeNull();
    });
  });

  describe("getChats", () => {
    it("should retrieve all chats for a user", async () => {
      const chatId1 = "chat-1";
      const chatId2 = "chat-2";

      // Create multiple chats
      await upsertChat({
        userId: testUser.id,
        chatId: chatId1,
        title: "First Chat",
        messages: [createTestMessage("Hello")],
      });

      await upsertChat({
        userId: testUser.id,
        chatId: chatId2,
        title: "Second Chat",
        messages: [createTestMessage("World")],
      });

      const chats = await getChats(testUser.id);

      expect(chats).toHaveLength(2);
      expect(chats[0].userId).toBe(testUser.id);
      expect(chats[1].userId).toBe(testUser.id);
      expect(chats.map(c => c.title)).toContain("First Chat");
      expect(chats.map(c => c.title)).toContain("Second Chat");

      // Clean up
      await cleanupTestData(chatId1);
      await cleanupTestData(chatId2);
    });

    it("should return empty array for user with no chats", async () => {
      const chats = await getChats("user-with-no-chats");
      expect(chats).toHaveLength(0);
    });
  });

  describe("generateChatTitle", () => {
    it("should generate a title for chat messages", async () => {
      const messages = [
        createTestMessage("What is the weather like today?"),
        createTestMessage("The weather is sunny and warm.", "assistant"),
        createTestMessage("That sounds great!"),
      ];

      const title = await generateChatTitle(messages);

      expect(title).toBeTruthy();
      expect(typeof title).toBe("string");
      expect(title.length).toBeGreaterThan(0);
      expect(title.length).toBeLessThanOrEqual(50);
    });

    it("should handle single message", async () => {
      const messages = [createTestMessage("Hello world")];

      const title = await generateChatTitle(messages);

      expect(title).toBeTruthy();
      expect(typeof title).toBe("string");
    });

    it("should handle empty messages array", async () => {
      const title = await generateChatTitle([]);

      expect(title).toBeTruthy();
      expect(typeof title).toBe("string");
    });
  });
});
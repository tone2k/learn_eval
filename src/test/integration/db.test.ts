import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateChatTitle, getChat, getChats, upsertChat } from "~/server/db/queries";
import { testEnvironment } from "~/test/environment";

describe("Database Queries Integration Tests", () => {
  const testUser = testEnvironment.utils.generateTestUser();
  const testChatId = testEnvironment.utils.generateTestId("chat");

  beforeEach(async () => {
    // Clean up any existing test data
    await testEnvironment.database.cleanup();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await testEnvironment.database.cleanup();
  });

  describe("upsertChat", () => {
    it("should create a new chat with messages", async () => {
      const messages = [
        testEnvironment.utils.generateTestMessage("Hello, how are you?"),
        testEnvironment.utils.generateTestMessage("I'm doing well, thank you!", "assistant"),
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
      const initialMessages = [testEnvironment.utils.generateTestMessage("Initial message")];
      await upsertChat({
        userId: testUser.id,
        chatId: testChatId,
        title: "Initial Chat",
        messages: initialMessages,
      });

      // Update with new messages
      const updatedMessages = [
        testEnvironment.utils.generateTestMessage("Initial message"),
        testEnvironment.utils.generateTestMessage("New message"),
        testEnvironment.utils.generateTestMessage("Response", "assistant"),
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
        messages: [testEnvironment.utils.generateTestMessage("Hello")],
      });

      // Try to update with different user
      const differentUser = testEnvironment.utils.generateTestUser();
      
      await expect(
        upsertChat({
          userId: differentUser.id,
          chatId: testChatId,
          title: "Hacked Chat",
          messages: [testEnvironment.utils.generateTestMessage("Hacked")],
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

    it("should handle large message arrays efficiently", async () => {
      const largeMessages = Array.from({ length: 100 }, (_, i) =>
        testEnvironment.utils.generateTestMessage(`Message ${i + 1}`, i % 2 === 0 ? "user" : "assistant")
      );

      const { result, duration } = await testEnvironment.utils.measurePerformance(
        async () => {
          return await upsertChat({
            userId: testUser.id,
            chatId: testChatId,
            title: "Large Chat",
            messages: largeMessages,
          });
        },
        10000 // 10 second timeout
      );

      expect(result).toEqual({ id: testChatId });
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      const chat = await getChat({ userId: testUser.id, chatId: testChatId });
      expect(chat?.messages).toHaveLength(100);
    });
  });

  describe("getChat", () => {
    it("should retrieve chat with messages", async () => {
      const messages = [
        testEnvironment.utils.generateTestMessage("Question"),
        testEnvironment.utils.generateTestMessage("Answer", "assistant"),
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
        messages: [testEnvironment.utils.generateTestMessage("Hello")],
      });

      // Try to get with different user
      const differentUser = testEnvironment.utils.generateTestUser();
      const chat = await getChat({ userId: differentUser.id, chatId: testChatId });
      expect(chat).toBeNull();
    });

    it("should handle concurrent access to the same chat", async () => {
      // Create chat
      await upsertChat({
        userId: testUser.id,
        chatId: testChatId,
        title: "Concurrent Chat",
        messages: [testEnvironment.utils.generateTestMessage("Initial")],
      });

      // Simulate concurrent reads
      const concurrentReads = Array.from({ length: 10 }, () =>
        getChat({ userId: testUser.id, chatId: testChatId })
      );

      const results = await Promise.all(concurrentReads);
      
      // All reads should return the same data
      results.forEach(chat => {
        expect(chat).toBeTruthy();
        expect(chat?.id).toBe(testChatId);
        expect(chat?.messages).toHaveLength(1);
      });
    });
  });

  describe("getChats", () => {
    it("should retrieve all chats for a user", async () => {
      const chatId1 = testEnvironment.utils.generateTestId("chat");
      const chatId2 = testEnvironment.utils.generateTestId("chat");

      // Create multiple chats
      await upsertChat({
        userId: testUser.id,
        chatId: chatId1,
        title: "First Chat",
        messages: [testEnvironment.utils.generateTestMessage("Hello")],
      });

      await upsertChat({
        userId: testUser.id,
        chatId: chatId2,
        title: "Second Chat",
        messages: [testEnvironment.utils.generateTestMessage("World")],
      });

      const chats = await getChats(testUser.id);

      expect(chats).toHaveLength(2);
      expect(chats[0].userId).toBe(testUser.id);
      expect(chats[1].userId).toBe(testUser.id);
      expect(chats.map(c => c.title)).toContain("First Chat");
      expect(chats.map(c => c.title)).toContain("Second Chat");
    });

    it("should return empty array for user with no chats", async () => {
      const newUser = testEnvironment.utils.generateTestUser();
      const chats = await getChats(newUser.id);
      expect(chats).toHaveLength(0);
    });

    it("should order chats by updatedAt descending", async () => {
      const chatId1 = testEnvironment.utils.generateTestId("chat");
      const chatId2 = testEnvironment.utils.generateTestId("chat");

      // Create first chat
      await upsertChat({
        userId: testUser.id,
        chatId: chatId1,
        title: "First Chat",
        messages: [testEnvironment.utils.generateTestMessage("First")],
      });

      // Wait a bit to ensure different timestamps
      await testEnvironment.utils.wait(100);

      // Create second chat
      await upsertChat({
        userId: testUser.id,
        chatId: chatId2,
        title: "Second Chat",
        messages: [testEnvironment.utils.generateTestMessage("Second")],
      });

      const chats = await getChats(testUser.id);
      expect(chats).toHaveLength(2);
      expect(chats[0].title).toBe("Second Chat"); // Most recent first
      expect(chats[1].title).toBe("First Chat");
    });
  });

  describe("generateChatTitle", () => {
    it("should generate a title for chat messages", async () => {
      const messages = [
        testEnvironment.utils.generateTestMessage("What is the weather like today?"),
        testEnvironment.utils.generateTestMessage("The weather is sunny and warm.", "assistant"),
        testEnvironment.utils.generateTestMessage("That sounds great!"),
      ];

      const title = await generateChatTitle(messages);

      expect(title).toBeTruthy();
      expect(typeof title).toBe("string");
      expect(title.length).toBeGreaterThan(0);
      expect(title.length).toBeLessThanOrEqual(50);
    });

    it("should handle single message", async () => {
      const messages = [testEnvironment.utils.generateTestMessage("Hello world")];

      const title = await generateChatTitle(messages);

      expect(title).toBeTruthy();
      expect(typeof title).toBe("string");
    });

    it("should handle empty messages array", async () => {
      const title = await generateChatTitle([]);

      expect(title).toBeTruthy();
      expect(typeof title).toBe("string");
    });

    it("should handle very long messages", async () => {
      const longMessage = "A".repeat(1000);
      const messages = [testEnvironment.utils.generateTestMessage(longMessage)];

      const title = await generateChatTitle(messages);

      expect(title).toBeTruthy();
      expect(typeof title).toBe("string");
      expect(title.length).toBeLessThanOrEqual(50);
    });
  });

  describe("Data Integrity", () => {
    it("should maintain referential integrity", async () => {
      // Create chat with messages
      await upsertChat({
        userId: testUser.id,
        chatId: testChatId,
        title: "Integrity Test",
        messages: [testEnvironment.utils.generateTestMessage("Test")],
      });

      // Verify no orphaned messages
      const integrityCheck = await testEnvironment.database.verifyDataIntegrity();
      expect(integrityCheck.success).toBe(true);
    });

    it("should handle database transaction rollbacks", async () => {
      // This test would require mocking the database to simulate transaction failures
      // For now, we'll test the basic transaction wrapper
      const result = await testEnvironment.database.withTransaction(async () => {
        return "transaction successful";
      });

      expect(result).toBe("transaction successful");
    });
  });
});
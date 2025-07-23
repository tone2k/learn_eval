import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET, POST } from "~/app/api/chat/route";
import { createTestUser, createTestMessage, createTestChat, createTestMessages, cleanupTestData, mockRequest } from "~/test/utils";
import { auth } from "~/server/auth";
import { checkRateLimit, recordRateLimit } from "~/server/rate-limit";

// Mock external dependencies
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("~/deep-search", () => ({
  streamFromDeepSearch: vi.fn().mockResolvedValue({
    mergeIntoDataStream: vi.fn(),
  }),
}));

vi.mock("langfuse", () => ({
  Langfuse: vi.fn().mockImplementation(() => ({
    trace: vi.fn().mockReturnValue({
      id: "test-trace-id",
      update: vi.fn(),
      span: vi.fn().mockReturnValue({
        end: vi.fn(),
      }),
    }),
    flushAsync: vi.fn(),
  })),
}));

describe("End-to-End Integration Tests", () => {
  const testUser = createTestUser();
  const testChatId = "e2e-test-chat-id";

  beforeEach(async () => {
    await cleanupTestData(testChatId);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData(testChatId);
  });

  describe("Complete Chat Flow", () => {
    it("should handle complete chat creation and message flow", async () => {
      // Mock authentication
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      // Step 1: Create a new chat
      const createRequest = mockRequest("POST", "/api/chat", {
        messages: [createTestMessage("Hello, how are you?")],
        chatId: testChatId,
        isNewChat: true,
      });

      const createResponse = await POST(createRequest);
      expect(createResponse.status).toBe(200);

      // Step 2: Verify chat was created in database
      const { getChat } = await import("~/server/db/queries");
      const createdChat = await getChat({ userId: testUser.id, chatId: testChatId });
      expect(createdChat).toBeTruthy();
      expect(createdChat?.title).toBe("Generating...");
      expect(createdChat?.messages).toHaveLength(1);

      // Step 3: Retrieve chat messages
      const getRequest = mockRequest("GET", `/api/chat?id=${testChatId}`);
      const getResponse = await GET(getRequest);
      expect(getResponse.status).toBe(200);

      const getData = await getResponse.json();
      expect(getData.messages).toHaveLength(1);
      expect(getData.messages[0].content).toBe("Hello, how are you?");

      // Step 4: Continue conversation
      const continueRequest = mockRequest("POST", "/api/chat", {
        messages: [createTestMessage("I'm doing well, thank you!")],
        chatId: testChatId,
        isNewChat: false,
      });

      const continueResponse = await POST(continueRequest);
      expect(continueResponse.status).toBe(200);

      // Step 5: Verify updated chat
      const updatedChat = await getChat({ userId: testUser.id, chatId: testChatId });
      expect(updatedChat).toBeTruthy();
      expect(updatedChat?.messages).toHaveLength(2);
    });

    it("should handle multiple users with separate chats", async () => {
      const user1 = { ...testUser, id: "user-1" };
      const user2 = { ...testUser, id: "user-2" };
      const chatId1 = "chat-user-1";
      const chatId2 = "chat-user-2";

      // Create chats for both users
      vi.mocked(auth).mockResolvedValue(mockSession(user1));
      await createTestChat(user1.id, chatId1, "User 1 Chat");
      await createTestMessages(chatId1, [
        { role: "user", content: "User 1 message" },
      ]);

      vi.mocked(auth).mockResolvedValue(mockSession(user2));
      await createTestChat(user2.id, chatId2, "User 2 Chat");
      await createTestMessages(chatId2, [
        { role: "user", content: "User 2 message" },
      ]);

      // Verify user 1 can only see their chat
      const request1 = mockRequest("GET", `/api/chat?id=${chatId1}`);
      const response1 = await GET(request1);
      expect(response1.status).toBe(200);
      const data1 = await response1.json();
      expect(data1.messages).toHaveLength(1);
      expect(data1.messages[0].content).toBe("User 1 message");

      // Verify user 2 can only see their chat
      const request2 = mockRequest("GET", `/api/chat?id=${chatId2}`);
      const response2 = await GET(request2);
      expect(response2.status).toBe(200);
      const data2 = await response2.json();
      expect(data2.messages).toHaveLength(1);
      expect(data2.messages[0].content).toBe("User 2 message");

      // Verify user 1 cannot access user 2's chat
      vi.mocked(auth).mockResolvedValue(mockSession(user1));
      const request3 = mockRequest("GET", `/api/chat?id=${chatId2}`);
      const response3 = await GET(request3);
      expect(response3.status).toBe(200);
      const data3 = await response3.json();
      expect(data3.messages).toHaveLength(0);

      // Clean up
      await cleanupTestData(chatId1);
      await cleanupTestData(chatId2);
    });
  });

  describe("Rate Limiting Integration", () => {
    it("should enforce rate limits across multiple requests", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      // Make multiple requests rapidly
      const requests = Array.from({ length: 5 }, (_, i) =>
        mockRequest("POST", "/api/chat", {
          messages: [createTestMessage(`Message ${i}`)],
          chatId: `${testChatId}-${i}`,
          isNewChat: true,
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));

      // Some requests should succeed, others should be rate limited
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      expect(successCount).toBeGreaterThan(0);
      expect(rateLimitedCount).toBeGreaterThan(0);
      expect(successCount + rateLimitedCount).toBe(5);

      // Clean up created chats
      for (let i = 0; i < 5; i++) {
        await cleanupTestData(`${testChatId}-${i}`);
      }
    });
  });

  describe("Data Consistency", () => {
    it("should maintain data consistency during concurrent operations", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      // Create initial chat
      await createTestChat(testUser.id, testChatId, "Initial Chat");
      await createTestMessages(testChatId, [
        { role: "user", content: "Initial message" },
      ]);

      // Simulate concurrent updates
      const concurrentRequests = Array.from({ length: 3 }, (_, i) =>
        mockRequest("POST", "/api/chat", {
          messages: [createTestMessage(`Concurrent message ${i}`)],
          chatId: testChatId,
          isNewChat: false,
        })
      );

      const responses = await Promise.all(concurrentRequests.map(req => POST(req)));

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify final state is consistent
      const { getChat } = await import("~/server/db/queries");
      const finalChat = await getChat({ userId: testUser.id, chatId: testChatId });
      expect(finalChat).toBeTruthy();
      expect(finalChat?.messages).toHaveLength(4); // Initial + 3 concurrent
    });

    it("should handle message transformation consistently", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      // Create chat with complex message content
      await createTestChat(testUser.id, testChatId, "Complex Chat");
      await createTestMessages(testChatId, [
        { role: "user", content: "Simple message" },
        { role: "assistant", content: JSON.stringify({ type: "tool", data: { result: "success" } }) },
        { role: "user", content: "Another message" },
      ]);

      // Retrieve and verify transformation
      const request = mockRequest("GET", `/api/chat?id=${testChatId}`);
      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.messages).toHaveLength(3);
      expect(data.messages[0].content).toBe("Simple message");
      expect(data.messages[1].content).toEqual({ type: "tool", data: { result: "success" } });
      expect(data.messages[2].content).toBe("Another message");
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle large message histories efficiently", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      // Create chat with many messages
      const manyMessages = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant" as const,
        content: `Message ${i}`,
      }));

      await createTestChat(testUser.id, testChatId, "Large Chat");
      await createTestMessages(testChatId, manyMessages);

      // Measure retrieval performance
      const startTime = Date.now();
      const request = mockRequest("GET", `/api/chat?id=${testChatId}`);
      const response = await GET(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second

      const data = await response.json();
      expect(data.messages).toHaveLength(100);
    });

    it("should handle rapid successive requests", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      const rapidRequests = Array.from({ length: 10 }, (_, i) =>
        mockRequest("POST", "/api/chat", {
          messages: [createTestMessage(`Rapid message ${i}`)],
          chatId: `${testChatId}-rapid-${i}`,
          isNewChat: true,
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(rapidRequests.map(req => POST(req)));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);

      // Clean up
      for (let i = 0; i < 10; i++) {
        await cleanupTestData(`${testChatId}-rapid-${i}`);
      }
    });
  });
});

// Helper function to create mock session
function mockSession(user: any) {
  return {
    user,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET, POST } from "~/app/api/chat/route";
import { createTestUser, createTestMessage, createTestChat, createTestMessages, cleanupTestData, mockRequest } from "~/test/utils";
import { auth } from "~/server/auth";

// Mock the auth function
vi.mock("~/server/auth", () => ({
  auth: vi.fn(),
}));

// Mock the deep search function
vi.mock("~/deep-search", () => ({
  streamFromDeepSearch: vi.fn().mockResolvedValue({
    mergeIntoDataStream: vi.fn(),
  }),
}));

// Mock Langfuse
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

describe("Chat API Integration Tests", () => {
  const testUser = createTestUser();
  const testChatId = "test-chat-id";

  beforeEach(async () => {
    // Clean up any existing test data
    await cleanupTestData(testChatId);
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData(testChatId);
  });

  describe("GET /api/chat", () => {
    it("should return 401 when user is not authenticated", async () => {
      // Mock auth to return no session
      vi.mocked(auth).mockResolvedValue(null);

      const request = mockRequest("GET", `/api/chat?id=${testChatId}`);
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("should return empty messages when no chat ID provided", async () => {
      // Mock auth to return valid session
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      const request = mockRequest("GET", "/api/chat");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ messages: [] });
    });

    it("should return empty messages for non-existent chat", async () => {
      // Mock auth to return valid session
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      const request = mockRequest("GET", `/api/chat?id=non-existent`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ messages: [] });
    });

    it("should return chat messages for existing chat", async () => {
      // Mock auth to return valid session
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      // Create test chat and messages
      await createTestChat(testUser.id, testChatId, "Test Chat");
      await createTestMessages(testChatId, [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ]);

      const request = mockRequest("GET", `/api/chat?id=${testChatId}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.messages).toHaveLength(2);
      expect(data.messages[0].role).toBe("user");
      expect(data.messages[0].content).toBe("Hello");
      expect(data.messages[1].role).toBe("assistant");
      expect(data.messages[1].content).toBe("Hi there!");
    });

    it("should return 500 on database error", async () => {
      // Mock auth to return valid session
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      // Mock database to throw error
      vi.doMock("~/server/db/queries", () => ({
        getChat: vi.fn().mockRejectedValue(new Error("Database error")),
      }));

      const request = mockRequest("GET", `/api/chat?id=${testChatId}`);
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/chat", () => {
    it("should return 401 when user is not authenticated", async () => {
      // Mock auth to return no session
      vi.mocked(auth).mockResolvedValue(null);

      const request = mockRequest("POST", "/api/chat", {
        messages: [createTestMessage("Hello")],
        chatId: testChatId,
        isNewChat: true,
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("should create new chat successfully", async () => {
      // Mock auth to return valid session
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      const request = mockRequest("POST", "/api/chat", {
        messages: [createTestMessage("Hello")],
        chatId: testChatId,
        isNewChat: true,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/plain");

      // Verify chat was created in database
      const { getChat } = await import("~/server/db/queries");
      const chat = await getChat({ userId: testUser.id, chatId: testChatId });
      expect(chat).toBeTruthy();
      expect(chat?.title).toBe("Generating...");
    });

    it("should handle existing chat continuation", async () => {
      // Mock auth to return valid session
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      // Create existing chat
      await createTestChat(testUser.id, testChatId, "Existing Chat");
      await createTestMessages(testChatId, [
        { role: "user", content: "Previous message" },
      ]);

      const request = mockRequest("POST", "/api/chat", {
        messages: [createTestMessage("New message")],
        chatId: testChatId,
        isNewChat: false,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("should return 404 for non-existent chat when isNewChat is false", async () => {
      // Mock auth to return valid session
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      const request = mockRequest("POST", "/api/chat", {
        messages: [createTestMessage("Hello")],
        chatId: "non-existent",
        isNewChat: false,
      });

      const response = await POST(request);

      expect(response.status).toBe(404);
    });

    it("should handle rate limiting", async () => {
      // Mock auth to return valid session
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      // Mock rate limiting to exceed limit
      vi.doMock("~/server/rate-limit", () => ({
        checkRateLimit: vi.fn().mockResolvedValue({
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 60000,
          totalHits: 20,
          retry: vi.fn().mockResolvedValue(false),
        }),
        recordRateLimit: vi.fn(),
      }));

      const request = mockRequest("POST", "/api/chat", {
        messages: [createTestMessage("Hello")],
        chatId: testChatId,
        isNewChat: true,
      });

      const response = await POST(request);

      expect(response.status).toBe(429);
      expect(response.headers.get("X-RateLimit-Limit")).toBe("20");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    });

    it("should handle malformed request body", async () => {
      // Mock auth to return valid session
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      const request = new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it("should handle missing required fields", async () => {
      // Mock auth to return valid session
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      const request = mockRequest("POST", "/api/chat", {
        messages: [createTestMessage("Hello")],
        // Missing chatId and isNewChat
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe("Message transformation", () => {
    it("should transform database messages correctly", async () => {
      // Mock auth to return valid session
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      // Create test chat with complex message content
      await createTestChat(testUser.id, testChatId, "Test Chat");
      await createTestMessages(testChatId, [
        { role: "user", content: "Simple message" },
        { role: "assistant", content: JSON.stringify({ type: "tool", content: "Tool response" }) },
      ]);

      const request = mockRequest("GET", `/api/chat?id=${testChatId}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.messages).toHaveLength(2);
      expect(data.messages[0].content).toBe("Simple message");
      expect(data.messages[1].content).toEqual({ type: "tool", content: "Tool response" });
    });
  });

  describe("Error handling", () => {
    it("should handle database transaction errors", async () => {
      // Mock auth to return valid session
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      // Mock database to throw error during transaction
      vi.doMock("~/server/db/queries", () => ({
        upsertChat: vi.fn().mockRejectedValue(new Error("Transaction failed")),
        getChat: vi.fn().mockResolvedValue(null),
      }));

      const request = mockRequest("POST", "/api/chat", {
        messages: [createTestMessage("Hello")],
        chatId: testChatId,
        isNewChat: true,
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it("should handle external service errors gracefully", async () => {
      // Mock auth to return valid session
      vi.mocked(auth).mockResolvedValue(mockSession(testUser));

      // Mock deep search to throw error
      vi.doMock("~/deep-search", () => ({
        streamFromDeepSearch: vi.fn().mockRejectedValue(new Error("External service error")),
      }));

      const request = mockRequest("POST", "/api/chat", {
        messages: [createTestMessage("Hello")],
        chatId: testChatId,
        isNewChat: true,
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
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
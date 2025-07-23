import { db } from "~/server/db";
import { chats, messages } from "~/server/db/schema";
import { eq, inArray, desc, asc } from "drizzle-orm";
import { testEnvUtils } from "./config";

// Database test utilities
export const testDatabase = {
  // Initialize test database
  async initialize() {
    try {
      // Test database connection
      await db.execute("SELECT 1");
      console.log("✅ Test database connection established");
      
      // Verify tables exist
      await db.execute("SELECT * FROM information_schema.tables WHERE table_name = 'chats'");
      await db.execute("SELECT * FROM information_schema.tables WHERE table_name = 'messages'");
      console.log("✅ Test database tables verified");
      
      return { success: true };
    } catch (error) {
      console.error("❌ Test database initialization failed:", error);
      return { success: false, error };
    }
  },

  // Clean up test data
  async cleanup(patterns: string[] = ["test-%", "e2e-%", "integration-%"]) {
    try {
      // Find test chats
      const testChats = await db
        .select()
        .from(chats)
        .where(
          inArray(
            chats.id,
            patterns.map(pattern => 
              db.raw(`id LIKE '${pattern}'`)
            )
          )
        );

      if (testChats.length > 0) {
        const testChatIds = testChats.map(chat => chat.id);
        
        // Delete messages first (foreign key constraint)
        await db.delete(messages).where(inArray(messages.chatId, testChatIds));
        
        // Delete chats
        await db.delete(chats).where(inArray(chats.id, testChatIds));
        
        console.log(`🧹 Cleaned up ${testChats.length} test chats and their messages`);
      }
      
      return { success: true, cleanedCount: testChats.length };
    } catch (error) {
      console.error("❌ Test database cleanup failed:", error);
      return { success: false, error };
    }
  },

  // Create test chat
  async createTestChat(data: {
    id?: string;
    title?: string;
    userId: string;
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
  }) {
    try {
      const chatId = data.id || testEnvUtils.generateTestId("chat");
      const title = data.title || "Test Chat";

      // Create chat
      await db.insert(chats).values({
        id: chatId,
        title,
        userId: data.userId,
      });

      // Create messages if provided
      if (data.messages && data.messages.length > 0) {
        await db.insert(messages).values(
          data.messages.map((msg, index) => ({
            id: testEnvUtils.generateTestId("msg"),
            chatId,
            role: msg.role,
            parts: msg.content,
            order: index,
          }))
        );
      }

      return { success: true, chatId };
    } catch (error) {
      console.error("❌ Failed to create test chat:", error);
      return { success: false, error };
    }
  },

  // Get test chat with messages
  async getTestChat(chatId: string, userId: string) {
    try {
      const chat = await db.query.chats.findFirst({
        where: eq(chats.id, chatId),
        with: {
          messages: {
            orderBy: [asc(messages.order)],
          },
        },
      });

      if (!chat || chat.userId !== userId) {
        return { success: false, chat: null };
      }

      return {
        success: true,
        chat: {
          ...chat,
          messages: chat.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.parts,
            annotations: message.annotations,
          })),
        },
      };
    } catch (error) {
      console.error("❌ Failed to get test chat:", error);
      return { success: false, error };
    }
  },

  // Update test chat
  async updateTestChat(chatId: string, updates: {
    title?: string;
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
  }) {
    try {
      // Update chat title if provided
      if (updates.title) {
        await db
          .update(chats)
          .set({ title: updates.title, updatedAt: new Date() })
          .where(eq(chats.id, chatId));
      }

      // Update messages if provided
      if (updates.messages) {
        // Delete existing messages
        await db.delete(messages).where(eq(messages.chatId, chatId));
        
        // Insert new messages
        await db.insert(messages).values(
          updates.messages.map((msg, index) => ({
            id: testEnvUtils.generateTestId("msg"),
            chatId,
            role: msg.role,
            parts: msg.content,
            order: index,
          }))
        );
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Failed to update test chat:", error);
      return { success: false, error };
    }
  },

  // Delete test chat
  async deleteTestChat(chatId: string) {
    try {
      // Delete messages first
      await db.delete(messages).where(eq(messages.chatId, chatId));
      
      // Delete chat
      await db.delete(chats).where(eq(chats.id, chatId));
      
      return { success: true };
    } catch (error) {
      console.error("❌ Failed to delete test chat:", error);
      return { success: false, error };
    }
  },

  // Get test chats for user
  async getTestChats(userId: string) {
    try {
      const userChats = await db
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

      return { success: true, chats: userChats };
    } catch (error) {
      console.error("❌ Failed to get test chats:", error);
      return { success: false, error };
    }
  },

  // Seed test data
  async seedTestData(userId: string, chatCount: number = 3) {
    try {
      const createdChats = [];

      for (let i = 0; i < chatCount; i++) {
        const chatId = testEnvUtils.generateTestId("chat");
        const messages = [
          { role: "user" as const, content: `User message ${i + 1}` },
          { role: "assistant" as const, content: `Assistant response ${i + 1}` },
        ];

        const result = await this.createTestChat({
          id: chatId,
          title: `Test Chat ${i + 1}`,
          userId,
          messages,
        });

        if (result.success) {
          createdChats.push(chatId);
        }
      }

      return { success: true, chatIds: createdChats };
    } catch (error) {
      console.error("❌ Failed to seed test data:", error);
      return { success: false, error };
    }
  },

  // Verify data integrity
  async verifyDataIntegrity() {
    try {
      // Check for orphaned messages
      const orphanedMessages = await db
        .select()
        .from(messages)
        .leftJoin(chats, eq(messages.chatId, chats.id))
        .where(eq(chats.id, null));

      if (orphanedMessages.length > 0) {
        console.warn(`⚠️ Found ${orphanedMessages.length} orphaned messages`);
        return { success: false, orphanedMessages: orphanedMessages.length };
      }

      // Check for chats without messages (this is okay)
      const chatsWithoutMessages = await db
        .select()
        .from(chats)
        .leftJoin(messages, eq(chats.id, messages.chatId))
        .where(eq(messages.id, null));

      console.log(`ℹ️ Found ${chatsWithoutMessages.length} chats without messages`);

      return { success: true };
    } catch (error) {
      console.error("❌ Data integrity check failed:", error);
      return { success: false, error };
    }
  },

  // Get database statistics
  async getStats() {
    try {
      const [chatCount, messageCount] = await Promise.all([
        db.select({ count: db.fn.count() }).from(chats),
        db.select({ count: db.fn.count() }).from(messages),
      ]);

      return {
        success: true,
        stats: {
          chats: chatCount[0]?.count || 0,
          messages: messageCount[0]?.count || 0,
        },
      };
    } catch (error) {
      console.error("❌ Failed to get database stats:", error);
      return { success: false, error };
    }
  },

  // Transaction wrapper
  async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    return await db.transaction(fn);
  },

  // Wait for database operation
  async waitForOperation<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 5000
  ): Promise<T> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        return await operation();
      } catch (error) {
        if (Date.now() - startTime >= timeoutMs) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    throw new Error(`Database operation timeout after ${timeoutMs}ms`);
  },
};

// Export for use in tests
export { testDatabase as db };
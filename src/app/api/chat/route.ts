import type { Message } from "ai";
import { appendResponseMessages, createDataStreamResponse } from "ai";
import { Langfuse } from "langfuse";
import { streamFromDeepSearch } from "~/deep-search";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { getChat, upsertChat } from "~/server/db/queries";
import { checkRateLimit, recordRateLimit, type RateLimitConfig } from "~/server/rate-limit";
import type { OurMessageAnnotation } from "~/types";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

// Rate limiting configuration
const rateLimitConfig: RateLimitConfig = {
  maxRequests: 20, // 20 requests per minute
  maxRetries: 3,
  windowMs: 60_000, // 1 minute window
  keyPrefix: "chat_api",
};

// Helper function to transform database message format to AI SDK format
function transformDatabaseMessageToAISDK(msg: any, index: number): Message {
  console.log(`🔍 Message ${index}:`, {
    id: msg.id,
    role: msg.role,
    contentType: typeof msg.content,
    content: msg.content,
    parts: msg.parts,
    createdAt: msg.createdAt,
  });

  // Parse content if it's a JSON string, otherwise use as-is
  let content = msg.content;
  if (typeof msg.content === "string" && (msg.content.startsWith('[') || msg.content.startsWith('{'))) {
    try {
      content = JSON.parse(msg.content);
    } catch (e) {
      // If parsing fails, keep as string
      content = msg.content;
    }
  }

  const transformedMessage: Message = {
    id: msg.id,
    role: msg.role,
    content: content,
    createdAt: msg.createdAt,
  };

  // Add parts if they exist
  if (msg.parts) {
    (transformedMessage as any).parts = msg.parts;
  }

  console.log(`🔍 Transformed message ${index}:`, transformedMessage);
  return transformedMessage;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const chatId = url.searchParams.get("id");
    
    if (!chatId) {
      return Response.json({ messages: [] });
    }

    const existingChat = await getChat({ chatId, userId: session.user.id });
    
    if (!existingChat) {
      return Response.json({ messages: [] });
    }

    console.log("🔍 Raw database messages:", JSON.stringify(existingChat.messages, null, 2));

    const messages = existingChat.messages.map((msg, index) => 
      transformDatabaseMessageToAISDK(msg, index)
    );

    console.log("🔍 Processed messages for frontend:", JSON.stringify(messages, null, 2));

    return Response.json({ messages });
  } catch (error) {
    console.error("Get chat error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    console.log("🔍 Session check:", !!session?.user, session?.user?.name);

    if (!session?.user) {
      console.log("❌ No session, returning 401");
      return new Response("Unauthorized", { status: 401 });
    }

    // Check rate limit for authenticated users
    console.log("🚦 Checking rate limit...");
    const rateLimitCheck = await checkRateLimit(rateLimitConfig);
    
    if (!rateLimitCheck.allowed) {
      console.log("🛑 Rate limit exceeded, waiting for reset...");
      const isAllowed = await rateLimitCheck.retry();
      
      if (!isAllowed) {
        console.log("❌ Rate limit exceeded after retries");
        return new Response("Rate limit exceeded", {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitConfig.maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimitCheck.remaining.toString(),
            "X-RateLimit-Reset": rateLimitCheck.resetTime.toString(),
          },
        });
      }
    }
    
    // Record the request
    await recordRateLimit(rateLimitConfig);
    console.log("✅ Rate limit check passed, proceeding with request");

    const { 
      messages, 
      chatId,
      isNewChat
    }: { 
      messages: Message[]; 
      chatId: string;
      isNewChat: boolean;
    } = await req.json();
    
    console.log("📝 Processing messages:", messages.length);
    console.log("📝 Last message:", messages[messages.length - 1]?.content);
    console.log("💬 Chat ID:", chatId);
    console.log("🆕 Is new chat:", isNewChat);
    console.log("🔍 Request body:", { chatId, isNewChat, messageCount: messages.length });

    const trace = langfuse.trace({
      name: "chat",
      userId: session.user.id,
    });

    let conversationMessages: Message[] = messages;

    // First, check if this chat already exists in the database
    const checkExistingChat = await getChat({ chatId, userId: session.user.id });
    
    if (isNewChat && !checkExistingChat) {
      // This is truly a new chat - create it
        // For new chats, create the chat with initial user message(s)
        const firstUserMessage = messages.find(m => m.role === "user");
        const title = typeof firstUserMessage?.content === "string" 
          ? firstUserMessage.content.slice(0, 100) 
          : "New Chat";
        
        console.log("🆕 Creating new chat:", chatId, "with title:", title);
        
        const createChatSpan = trace.span({
          name: "create-new-chat",
          input: {
            userId: session.user.id,
            chatId,
            title,
            messages: messages.filter(m => m.role === "user"),
          },
        });
        
        await upsertChat({
          userId: session.user.id,
          chatId: chatId,
          title,
          messages: messages.filter(m => m.role === "user"),
        });
        
        createChatSpan.end({
          output: {
            chatId,
          },
        });
    } else {
      // This is an existing chat - verify ownership and load messages
      // For existing chats, load the complete conversation history
      console.log("📖 Loading existing chat:", chatId);
      
      const verifyChatOwnershipSpan = trace.span({
        name: "verify-chat-ownership",
        input: {
          chatId,
          userId: session.user.id,
        },
      });
      
      verifyChatOwnershipSpan.end({
        output: {
          exists: !!checkExistingChat,
          belongsToUser: !!checkExistingChat,
        },
      });
      
      if (!checkExistingChat) {
        console.log("❌ Chat not found or access denied");
        return new Response("Chat not found", { status: 404 });
      }
      
      // Transform existing messages from database format to AI SDK format
      const existingMessages = checkExistingChat.messages.map((msg, index) => 
        transformDatabaseMessageToAISDK(msg, index)
      );
      
      // The frontend sends only new messages, so append them to existing ones
      conversationMessages = [...existingMessages, ...messages];
      console.log("📝 Existing messages:", existingMessages.length);
      console.log("📝 New messages:", messages.length);
      console.log("📝 Total conversation messages:", conversationMessages.length);
    }
    
    // Update trace with sessionId after chat is created/loaded
    trace.update({
      sessionId: chatId,
    });

    console.log("🔧 Starting deep search stream");
    
    // Collect annotations in memory during the stream
    const annotations: OurMessageAnnotation[] = [];

    return createDataStreamResponse({
      async execute(dataStream) {
        // Send new chat created event only if this is truly a new chat
        // Check if chat exists first to prevent duplicate creation events
        const chatExists = await getChat({ chatId, userId: session.user.id });
        if (isNewChat && !chatExists) {
          dataStream.writeData({
            type: "NEW_CHAT_CREATED",
            chatId: chatId,
          });
        }

        const result = await streamFromDeepSearch({
          messages: conversationMessages,
          telemetry: {
            isEnabled: true,
            functionId: "agent",
            metadata: {
              langfuseTraceId: trace.id,
            },
          },
          writeMessageAnnotation: (annotation: OurMessageAnnotation) => {
            // Save the annotation in-memory
            annotations.push(annotation);
            // Send it to the client
            dataStream.writeMessageAnnotation(annotation as any);
          },
          onFinish: async ({ response }: any) => {
            console.log("onFinish", response);
            
            try {
              // Merge the existing messages with the response messages
              const updatedMessages = appendResponseMessages({
                messages: conversationMessages,
                responseMessages: response.messages,
              });

              const lastMessage = updatedMessages[updatedMessages.length - 1];
              if (!lastMessage) {
                return;
              }

              // Add the annotations to the last message
              (lastMessage as any).annotations = annotations;

              // Extract title from the first user message
              const firstUserMessage = updatedMessages.find(m => m.role === "user");
              const title = typeof firstUserMessage?.content === "string" 
                ? firstUserMessage.content.slice(0, 50) + "..." 
                : "New Chat";

              // Save the complete chat history
              await upsertChat({
                userId: session.user.id,
                chatId,
                title,
                messages: updatedMessages,
              });

              await langfuse.flushAsync();
            } catch (error) {
              console.error("❌ Error saving chat:", error);
            }
          },
        });

        result.mergeIntoDataStream(dataStream);
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 
import { geolocation } from "@vercel/functions";
import type { UIMessageStreamWriter } from "ai";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { Langfuse } from "langfuse";
import { streamFromDeepSearch } from "~/deep-search";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { generateChatTitle, getChat, upsertChat } from "~/server/db/queries";
import { checkRateLimit, recordRateLimit, type RateLimitConfig } from "~/server/rate-limit";
import type { OurMessage, UserLocation, DatabaseMessage, UsageMetrics } from "~/types";
import { messageToString } from "~/utils";

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
function transformDatabaseMessageToAISDK(msg: DatabaseMessage, index: number): OurMessage {
  console.log(`🔍 Message ${index}:`, {
    id: msg.id,
    role: msg.role,
    contentType: typeof msg.content,
    content: msg.content,
    parts: msg.parts,
    createdAt: msg.createdAt,
  });

  // In AI SDK v5, messages use parts instead of content
  // If we have stored parts, use them; otherwise convert content to text part
  let parts: Array<{ type: string; text?: string; [key: string]: unknown }> = [];
  
  if (msg.parts && Array.isArray(msg.parts)) {
    parts = msg.parts;
  } else if (msg.content) {
    // Convert legacy content to text part
    const contentText = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    parts = [{ type: 'text', text: contentText }];
  }

  const transformedMessage: OurMessage = {
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    parts: parts as OurMessage['parts'],
  };

  console.log(`🔍 Transformed message ${index}:`, transformedMessage);
  return transformedMessage;
}

function getUserLocation(request: Request): UserLocation {
  // Mock location data for development
  if (env.NODE_ENV === "development") {
    // Set headers directly on the original request instead of creating a new one
    request.headers.set("x-vercel-ip-country", "US");
    request.headers.set("x-vercel-ip-country-region", "CA");
    request.headers.set("x-vercel-ip-city", "San Francisco");
    request.headers.set("x-vercel-ip-latitude", "37.7749");
    request.headers.set("x-vercel-ip-longitude", "-122.4194");
    
    const { longitude, latitude, city, country } = geolocation(request);
    return { longitude, latitude, city, country };
  }

  // Use actual geolocation in production
  const { longitude, latitude, city, country } = geolocation(request);
  return { longitude, latitude, city, country };
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
      transformDatabaseMessageToAISDK(msg as DatabaseMessage, index)
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

    // Get user's location information
    const userLocation = getUserLocation(req);
    console.log("📍 User location:", userLocation);

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

    const requestBody = await req.json();
    console.log("📦 Full request body:", JSON.stringify(requestBody, null, 2));
    const { messages }: { messages: OurMessage[] } = requestBody;
    
    // Extract chatId from the URL or useChat id
    const url = new URL(req.url);
    const chatIdFromParam = url.searchParams.get('chatId');
    
    console.log("🔍 URL:", req.url);
    console.log("🔍 URL params:", Object.fromEntries(url.searchParams));
    console.log("🔍 Request body keys:", Object.keys(requestBody));
    console.log("🔍 Request body.id:", requestBody.id);
    console.log("🔍 chatIdFromParam:", chatIdFromParam);
    
    // Get chatId from URL param first, then request body, then generate new one
    const providedChatId = chatIdFromParam || requestBody.id;
    let chatId = providedChatId || crypto.randomUUID();
    
    // Check if the chat actually exists in the database to determine if it's new
    let isNewChat = true;
    let existingChat = null;
    
    if (providedChatId) {
      existingChat = await getChat({ chatId: providedChatId, userId: session.user.id });
      isNewChat = !existingChat;
      
      if (!existingChat) {
        // The provided ID doesn't exist, so generate a new one for this chat
        chatId = crypto.randomUUID();
        console.log("🔄 Provided chat ID doesn't exist, generating new one:", chatId);
      }
    }
    
    console.log("📝 Processing messages:", messages.length);
    const lastMessage = messages[messages.length - 1];
    console.log("📝 Last message:", lastMessage ? messageToString(lastMessage) : "No messages");
    console.log("💬 Final Chat ID:", chatId);
    console.log("🆕 Is new chat:", isNewChat);
    console.log("🔍 Decision logic: chatIdFromParam?", !!chatIdFromParam, "requestBody.id?", !!requestBody.id);

    const trace = langfuse.trace({
      name: "chat",
      userId: session.user.id,
    });

    let conversationMessages: OurMessage[] = messages;

    // Start generating title in parallel for new chats
    let titlePromise: Promise<string> | undefined;
    
    // We already checked if the chat exists above
    console.log("🔍 Existing chat found:", !!existingChat);
    
    if (isNewChat) {
      // This is a new chat - start generating title in parallel
      titlePromise = generateChatTitle(messages);
      
      console.log("🆕 Creating new chat:", chatId, "with generating title...");
      
      const createChatSpan = trace.span({
        name: "create-new-chat",
        input: {
          userId: session.user.id,
          chatId,
          title: "Analyzing...",
          messages: messages.filter(m => m.role === "user"),
        },
      });
      
      // Create the chat with temporary title while we generate the real one
      await upsertChat({
        userId: session.user.id,
        chatId: chatId,
        title: "Analyzing...",
        messages: messages.filter(m => m.role === "user"),
      });
      
      createChatSpan.end({
        output: {
          chatId,
        },
      });
    } else {
      // This is an existing chat (we already verified it exists above)
      
      // This is an existing chat - load messages
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
          exists: true,
          belongsToUser: true,
        },
      });
      
      // Transform existing messages from database format to AI SDK format  
      const existingMessages = existingChat?.messages?.map((msg, index) => 
        transformDatabaseMessageToAISDK(msg as DatabaseMessage, index)
      ) ?? [];
      
      // The frontend sends only new messages, so append them to existing ones
      conversationMessages = [...existingMessages, ...messages];
      console.log("📝 Existing messages:", existingMessages.length);
      console.log("📝 New messages:", messages.length);
      console.log("📝 Total conversation messages:", conversationMessages.length);
      
      // No title generation needed for existing chats
      titlePromise = Promise.resolve("");
    }
    
    // Update trace with sessionId after chat is created/loaded
    trace.update({
      sessionId: chatId,
    });

    console.log("🔧 Starting deep search stream");
    
    // Create the UI message stream with type-safe data parts
    const stream = createUIMessageStream<OurMessage>({
      async execute({ writer }: { writer: UIMessageStreamWriter<OurMessage> }) {
        // Send new chat created event if this is a new chat (transient data part)
        if (isNewChat) {
          await writer.write({
            type: "data-newChatCreated",
            data: { chatId },
          });
        }

        const { result } = await streamFromDeepSearch({
          messages: conversationMessages,
          telemetry: {
            isEnabled: true,
            functionId: "agent",
            metadata: {
              langfuseTraceId: trace.id,
            },
          },
          writeMessagePart: writer.write,
          userLocation,
        });

        // Merge the final streaming result into our stream
        await writer.merge(result.toUIMessageStream());
      },
      onFinish: async ({ messages }: { messages: OurMessage[] }) => {
        console.log("🏁 Stream finished, saving chat");
        
        try {
          // Get the complete updated conversation
          const updatedMessages = [...conversationMessages, ...messages];

          // Await the title generation if it was started
          const generatedTitle = titlePromise ? await titlePromise : "";

          // Save the complete chat history with generated title (if available)
          await upsertChat({
            userId: session.user.id,
            chatId,
            messages: updatedMessages,
            ...(generatedTitle ? { title: generatedTitle } : {}),
          });

          await langfuse.flushAsync();
        } catch (error) {
          console.error("❌ Error saving chat:", error);
        }
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 
import type { Message } from "ai";
import { appendResponseMessages, createDataStreamResponse, streamText } from "ai";
import { Langfuse } from "langfuse";
import { z } from "zod";
import { env } from "~/env";
import { defaultModel } from "~/models";
import { searchSerper } from "~/serper";
import { auth } from "~/server/auth";
import { getChat, upsertChat } from "~/server/db/queries";
import { bulkCrawlWebsites } from "~/server/tools/crawler";
import { cacheWithRedis } from "~/server/redis/redis";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

// Helper function to transform database message format to AI SDK format
function transformDatabaseMessageToAISDK(msg: any, index: number): Message {
  console.log(`🔍 Message ${index}:`, {
    id: msg.id,
    role: msg.role,
    contentType: typeof msg.content,
    content: msg.content,
    createdAt: msg.createdAt,
  });

  // Transform the database content format to proper AI SDK format
  let transformedMessage: any = {
    id: msg.id,
    role: msg.role,
    createdAt: msg.createdAt,
  };

  // Handle content transformation
  if (Array.isArray(msg.content)) {
    // Content is stored as array of parts
    const textParts = msg.content.filter((part: any) => part.type === "text");
    const hasNonTextParts = msg.content.some((part: any) => part.type !== "text");

    if (hasNonTextParts || textParts.length > 1) {
      // Complex message with multiple parts or non-text parts - use parts format
      transformedMessage.parts = msg.content;
      transformedMessage.content = ""; // AI SDK expects content to be present
    } else if (textParts.length === 1) {
      // Simple text message - extract the text string
      transformedMessage.content = textParts[0].text;
    } else {
      // Fallback for edge cases
      transformedMessage.content = "";
    }
  } else if (typeof msg.content === "string") {
    // Content is already a string
    transformedMessage.content = msg.content;
  } else {
    // Fallback for unexpected formats
    transformedMessage.content = JSON.stringify(msg.content);
  }

  console.log(`🔍 Transformed message ${index}:`, transformedMessage);
  return transformedMessage as Message;
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

    const existingChat = await getChat(chatId, session.user.id!);
    
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

    const trace = langfuse.trace({
      sessionId: chatId,
      name: "chat",
      userId: session.user.id,
    });

    let conversationMessages: Message[] = messages;

    if (isNewChat) {
      // For new chats, create the chat with initial user message(s)
      const firstUserMessage = messages.find(m => m.role === "user");
      const title = typeof firstUserMessage?.content === "string" 
        ? firstUserMessage.content.slice(0, 100) 
        : "New Chat";
      
      console.log("🆕 Creating new chat:", chatId, "with title:", title);
      
      await upsertChat({
        userId: session.user.id!,
        chatId: chatId,
        title,
        messages: messages.filter(m => m.role === "user"),
      });
    } else {
      // For existing chats, load the complete conversation history
      console.log("📖 Loading existing chat:", chatId);
      
      const existingChat = await getChat(chatId, session.user.id!);
      
      if (!existingChat) {
        console.log("❌ Chat not found or access denied");
        return new Response("Chat not found", { status: 404 });
      }
      
      // Transform existing messages from database format to AI SDK format
      const existingMessages = existingChat.messages.map((msg, index) => 
        transformDatabaseMessageToAISDK(msg, index)
      );
      
      // The frontend sends only new messages, so append them to existing ones
      conversationMessages = [...existingMessages, ...messages];
      console.log("📝 Existing messages:", existingMessages.length);
      console.log("📝 New messages:", messages.length);
      console.log("📝 Total conversation messages:", conversationMessages.length);
    }

    // Create cached version of bulkCrawlWebsites
    const cachedBulkCrawlWebsites = cacheWithRedis(
      "bulkCrawlWebsites",
      bulkCrawlWebsites
    );

    // Define tools object
    const tools = {
      searchWeb: {
        description: "Search the web for current information using Google search",
        parameters: z.object({
          query: z.string().describe("The search query to look up"),
          num: z.number().default(10).describe("Number of search results to return (default: 10)"),
        }),
        execute: async (args: { query: string; num: number }, options: { abortSignal?: AbortSignal }) => {
          console.log("🔍 Search tool called with query:", args.query);
          try {
            const results = await searchSerper({ q: args.query, num: args.num }, options.abortSignal);
            console.log("✅ Search successful, found", results.organic.length, "results");

            // Return formatted results for the AI to use
            return {
              query: args.query,
              results: results.organic.map(result => ({
                title: result.title,
                url: result.link,
                snippet: result.snippet,
                date: result.date,
              })),
              knowledgeGraph: results.knowledgeGraph,
              peopleAlsoAsk: results.peopleAlsoAsk,
              relatedSearches: results.relatedSearches,
              totalResults: results.organic.length,
            };
          } catch (error) {
            console.error("❌ Search error:", error);
            return {
              error: "Failed to search the web. Please try again.",
              query: args.query,
            };
          }
        },
      },
      scrapePages: {
        description: "Fetch and extract the full content of web pages in markdown format",
        parameters: z.object({
          urls: z.array(z.string()).describe("Array of URLs to scrape and extract content from"),
        }),
        execute: async (args: { urls: string[] }, options: { abortSignal?: AbortSignal }) => {
          console.log("🌐 Scrape pages tool called with URLs:", args.urls);
          try {
            const results = await cachedBulkCrawlWebsites({ urls: args.urls });
            console.log("✅ Scraping completed, success:", results.success);

            if (results.success) {
              // Return successful results formatted for the AI
              return {
                success: true,
                pages: results.results.map(r => ({
                  url: r.url,
                  content: r.result.data,
                })),
                totalPages: results.results.length,
              };
            } else {
              // Return with error details
              return {
                success: false,
                error: results.error,
                pages: results.results.map(r => ({
                  url: r.url,
                  content: r.result.success ? r.result.data : null,
                  error: !r.result.success ? r.result.error : null,
                })),
              };
            }
          } catch (error) {
            console.error("❌ Scraping error:", error);
            return {
              success: false,
              error: "Failed to scrape web pages. Please try again.",
              urls: args.urls,
            };
          }
        },
      },
    };

    console.log("🔧 Tools configuration:", Object.keys(tools));
    console.log("🔧 Model being used:", defaultModel.modelId);

    return createDataStreamResponse({
      async execute(dataStream) {
        // Send new chat created event if this is a new chat
        if (isNewChat) {
          dataStream.writeData({
            type: "NEW_CHAT_CREATED",
            chatId: chatId,
          });
        }

        const result = await streamText({
          model: defaultModel,
          messages: conversationMessages,
          maxSteps: 10,
          toolChoice: 'auto', // Explicitly enable automatic tool choice
          system: `You are a helpful AI assistant with access to real-time web search capabilities.

AVAILABLE TOOLS:
1. searchWeb - Search the web for current information using Google search
   - Returns search results with titles, URLs, snippets, and additional information
   - Use this to find relevant pages and get an overview of available information

TOOL USAGE STRATEGY:
- Use searchWeb to find relevant information about the topic
- The search results will provide you with titles, URLs, and content snippets
- Use the information from search results to provide comprehensive answers

MANDATORY INSTRUCTIONS:
- You MUST use the searchWeb tool for any factual questions, news, or current events
- Do NOT say you need the function provided - IT IS ALREADY AVAILABLE
- Do NOT say you cannot access information - USE THE TOOL
- Use the search results to gather comprehensive information

RESPONSE FORMAT:
1. Use searchWeb tool to gather information
2. Synthesize information from search results
3. ALWAYS cite sources with [title](URL) format using the URLs from search results
4. Provide comprehensive, well-structured answers based on search snippets

Remember: For any question requiring current information, use searchWeb to get up-to-date answers.`,
          tools,
          experimental_telemetry: {
            isEnabled: true,
            functionId: "agent",
            metadata: {
              langfuseTraceId: trace.id,
            },
          },
          onStepFinish: (step) => {
            console.log("🚀 Step finished:", step.stepType);
            if (step.toolCalls) {
              console.log("🔨 Tool calls in this step:", step.toolCalls.length);
              step.toolCalls.forEach(call => {
                console.log("🔨 Tool call:", call.toolName, call.args);
              });
            }
            if (step.toolResults) {
              console.log("📊 Tool results:", step.toolResults.length);
            }
          },
          onFinish: async ({ text, finishReason, usage, response }) => {
            console.log("🏁 Stream finished, saving to database");
            console.log("📊 Finish reason:", finishReason);
            console.log("💬 Response messages:", response.messages.length);
            
            try {
              // Append response messages to existing messages
              const updatedMessages = appendResponseMessages({
                messages: conversationMessages, // Use conversationMessages for saving
                responseMessages: response.messages,
              });
              
              console.log("📝 Updated messages count:", updatedMessages.length);
              
              // Extract title from the first user message if this is a new chat
              const firstUserMessage = updatedMessages.find(m => m.role === "user");
              const title = typeof firstUserMessage?.content === "string" 
                ? firstUserMessage.content.slice(0, 100) 
                : "New Chat";
              
              // Save the complete chat with all messages
              await upsertChat({
                userId: session.user.id!,
                chatId: chatId,
                title,
                messages: updatedMessages,
              });
              
              console.log("✅ Chat saved successfully:", chatId);

              // Flush Langfuse trace data
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
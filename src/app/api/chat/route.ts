import type { Message } from "ai";
import { appendResponseMessages, createDataStreamResponse, streamText } from "ai";
import { z } from "zod";
import { defaultModel } from "~/models";
import { searchSerper } from "~/serper";
import { auth } from "~/server/auth";
import { getChat, upsertChat } from "~/server/db/queries";

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

    const messages = existingChat.messages.map((msg, index) => {
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
      return transformedMessage;
    });

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
      chatId 
    }: { 
      messages: Message[]; 
      chatId?: string 
    } = await req.json();
    
    console.log("📝 Processing messages:", messages.length);
    console.log("📝 Last message:", messages[messages.length - 1]?.content);
    console.log("💬 Chat ID:", chatId || "Creating new chat");

    // Generate a new chat ID if none provided
    const currentChatId = chatId || crypto.randomUUID();
    const isNewChat = !chatId;
    
    let conversationMessages: Message[] = messages;

    if (isNewChat) {
      // For new chats, create the chat with initial user message(s)
      const firstUserMessage = messages.find(m => m.role === "user");
      const title = typeof firstUserMessage?.content === "string" 
        ? firstUserMessage.content.slice(0, 100) 
        : "New Chat";
      
      console.log("🆕 Creating new chat:", currentChatId, "with title:", title);
      
      await upsertChat({
        userId: session.user.id!,
        chatId: currentChatId,
        title,
        messages: messages.filter(m => m.role === "user"),
      });
    } else {
      // For existing chats, load the complete conversation history
      console.log("📖 Loading existing chat:", currentChatId);
      
      const existingChat = await getChat(currentChatId, session.user.id!);
      
      if (!existingChat) {
        console.log("❌ Chat not found or access denied");
        return new Response("Chat not found", { status: 404 });
      }
      
      // Get existing messages from database
      const existingMessages = existingChat.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      })) as Message[];
      
      // The frontend sends only new messages, so append them to existing ones
      conversationMessages = [...existingMessages, ...messages];
      console.log("📝 Existing messages:", existingMessages.length);
      console.log("📝 New messages:", messages.length);
      console.log("📝 Total conversation messages:", conversationMessages.length);
    }

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
    };

    console.log("🔧 Tools configuration:", Object.keys(tools));
    console.log("🔧 Model being used:", defaultModel.modelId);

    return createDataStreamResponse({
      async execute(dataStream) {
        // Send new chat created event if this is a new chat
        if (isNewChat) {
          dataStream.writeData({
            type: "NEW_CHAT_CREATED",
            chatId: currentChatId,
          });
        }

        const result = await streamText({
          model: defaultModel,
          messages: conversationMessages,
          maxSteps: 10,
          toolChoice: 'auto', // Explicitly enable automatic tool choice
          system: `You are a helpful AI assistant with access to real-time web search capabilities.

MANDATORY TOOL USAGE:
- You HAVE a searchWeb tool available RIGHT NOW
- For the user's questions, you MUST call searchWeb("users_question", 10)
- Do NOT say you need the function provided - IT IS ALREADY AVAILABLE
- Do NOT say you cannot access information - USE THE TOOL

INSTRUCTIONS:
1. IMMEDIATELY use searchWeb for any news, current events, or factual questions
2. ALWAYS cite sources with [title](URL) format
3. Provide comprehensive, current information

The user is asking about current news - USE THE SEARCH TOOL NOW.`,
          tools,
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
                chatId: currentChatId,
                title,
                messages: updatedMessages,
              });
              
              console.log("✅ Chat saved successfully:", currentChatId);
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
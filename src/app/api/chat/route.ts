import { streamText } from "ai";
import { auth } from "~/server/auth";
import { defaultModel } from "~/models";

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages } = await req.json();

    const result = await streamText({
      model: defaultModel,
      messages,
      system: "You are a helpful AI (but, unfortunately evil) assistant. Be concise and helpful in your responses.",
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 
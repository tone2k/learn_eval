import { auth } from "~/server/auth";
import { deleteChat } from "~/server/db/queries";

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json() as { chatId: string };
    const { chatId } = body;
    
    if (!chatId) {
      return new Response("Chat ID is required", { status: 400 });
    }

    await deleteChat({
      userId: session.user.id,
      chatId,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete chat error:", error);
    
    if (error instanceof Error && error.message === "Chat not found or access denied") {
      return new Response("Chat not found or access denied", { status: 404 });
    }
    
    return new Response("Internal Server Error", { status: 500 });
  }
}
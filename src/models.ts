import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "~/env";

const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const geminiFlash = google("gemini-1.5-flash-latest");
export const geminiPro = google("gemini-1.5-pro-latest");

// Default model for the chat
export const defaultModel = geminiFlash; 
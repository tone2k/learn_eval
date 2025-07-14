export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export function sanitizeTitle(content: string): string {
  // Extract first line and clean it up for use as a title
  const firstLine = content.split('\n')[0];
  return truncateText(firstLine?.trim() || "New Chat", 50);
} 
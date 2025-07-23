import { describe, it, expect } from "vitest";
import { markdownJoinerTransform } from "~/markdown-transform";

describe("Utility Functions Integration Tests", () => {
  describe("Markdown Joiner Transform", () => {
    it("should process text with markdown elements", async () => {
      const transform = markdownJoinerTransform();
      const stream = transform();
      
      const input = "Hello **bold** world";
      const reader = stream.readable.getReader();
      const writer = stream.writable.getWriter();
      
      // Write input
      await writer.write({ type: "text-delta", textDelta: input });
      await writer.close();
      
      // Read output
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should handle empty input", async () => {
      const transform = markdownJoinerTransform();
      const stream = transform();
      
      const reader = stream.readable.getReader();
      const writer = stream.writable.getWriter();
      
      await writer.close();
      
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      expect(chunks).toBeDefined();
    });

    it("should handle non-text chunks", async () => {
      const transform = markdownJoinerTransform();
      const stream = transform();
      
      const reader = stream.readable.getReader();
      const writer = stream.writable.getWriter();
      
      // Write non-text chunk
      await writer.write({ type: "tool-call", toolCall: { id: "test", name: "test", args: {} } });
      await writer.close();
      
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].type).toBe("tool-call");
    });

    it("should handle markdown links", async () => {
      const transform = markdownJoinerTransform();
      const stream = transform();
      
      const input = "Visit [Google](https://google.com) for search";
      const reader = stream.readable.getReader();
      const writer = stream.writable.getWriter();
      
      await writer.write({ type: "text-delta", textDelta: input });
      await writer.close();
      
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should handle markdown bold text", async () => {
      const transform = markdownJoinerTransform();
      const stream = transform();
      
      const input = "This is **bold** text";
      const reader = stream.readable.getReader();
      const writer = stream.writable.getWriter();
      
      await writer.write({ type: "text-delta", textDelta: input });
      await writer.close();
      
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should handle mixed content", async () => {
      const transform = markdownJoinerTransform();
      const stream = transform();
      
      const reader = stream.readable.getReader();
      const writer = stream.writable.getWriter();
      
      // Write mixed content
      await writer.write({ type: "text-delta", textDelta: "Hello " });
      await writer.write({ type: "tool-call", toolCall: { id: "test", name: "test", args: {} } });
      await writer.write({ type: "text-delta", textDelta: " **world**" });
      await writer.close();
      
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(1);
    });
  });
});
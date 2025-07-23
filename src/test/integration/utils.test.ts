import { describe, it, expect } from "vitest";
import { transformMarkdown } from "~/markdown-transform";

describe("Utility Functions Integration Tests", () => {
  describe("Markdown Transformation", () => {
    it("should transform basic markdown correctly", () => {
      const markdown = "# Hello World\n\nThis is a **bold** text with *italic*.";
      const result = transformMarkdown(markdown);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result).toContain("<h1>Hello World</h1>");
      expect(result).toContain("<strong>bold</strong>");
      expect(result).toContain("<em>italic</em>");
    });

    it("should handle code blocks", () => {
      const markdown = "```javascript\nconst x = 1;\nconsole.log(x);\n```";
      const result = transformMarkdown(markdown);

      expect(result).toBeDefined();
      expect(result).toContain("<pre><code class=\"language-javascript\">");
      expect(result).toContain("const x = 1;");
      expect(result).toContain("console.log(x);");
    });

    it("should handle inline code", () => {
      const markdown = "Use `console.log()` to print to console.";
      const result = transformMarkdown(markdown);

      expect(result).toBeDefined();
      expect(result).toContain("<code>console.log()</code>");
    });

    it("should handle links", () => {
      const markdown = "Visit [Google](https://google.com) for search.";
      const result = transformMarkdown(markdown);

      expect(result).toBeDefined();
      expect(result).toContain('<a href="https://google.com">Google</a>');
    });

    it("should handle lists", () => {
      const markdown = "- Item 1\n- Item 2\n- Item 3";
      const result = transformMarkdown(markdown);

      expect(result).toBeDefined();
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>Item 1</li>");
      expect(result).toContain("<li>Item 2</li>");
      expect(result).toContain("<li>Item 3</li>");
    });

    it("should handle numbered lists", () => {
      const markdown = "1. First item\n2. Second item\n3. Third item";
      const result = transformMarkdown(markdown);

      expect(result).toBeDefined();
      expect(result).toContain("<ol>");
      expect(result).toContain("<li>First item</li>");
      expect(result).toContain("<li>Second item</li>");
      expect(result).toContain("<li>Third item</li>");
    });

    it("should handle blockquotes", () => {
      const markdown = "> This is a blockquote\n> with multiple lines";
      const result = transformMarkdown(markdown);

      expect(result).toBeDefined();
      expect(result).toContain("<blockquote>");
      expect(result).toContain("This is a blockquote");
    });

    it("should handle tables", () => {
      const markdown = "| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |";
      const result = transformMarkdown(markdown);

      expect(result).toBeDefined();
      expect(result).toContain("<table>");
      expect(result).toContain("<thead>");
      expect(result).toContain("<tbody>");
      expect(result).toContain("Header 1");
      expect(result).toContain("Cell 1");
    });

    it("should handle empty markdown", () => {
      const result = transformMarkdown("");
      expect(result).toBeDefined();
      expect(result).toBe("");
    });

    it("should handle null/undefined input", () => {
      const result1 = transformMarkdown(null as any);
      const result2 = transformMarkdown(undefined as any);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it("should preserve HTML in markdown", () => {
      const markdown = "This is <strong>HTML</strong> in markdown.";
      const result = transformMarkdown(markdown);

      expect(result).toBeDefined();
      expect(result).toContain("<strong>HTML</strong>");
    });

    it("should handle complex nested structures", () => {
      const markdown = `
# Main Title

## Subtitle

This is a paragraph with **bold** and *italic* text.

- List item 1
- List item 2 with [link](https://example.com)
- List item 3

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

> This is a blockquote
> with multiple lines

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
      `;

      const result = transformMarkdown(markdown);

      expect(result).toBeDefined();
      expect(result).toContain("<h1>Main Title</h1>");
      expect(result).toContain("<h2>Subtitle</h2>");
      expect(result).toContain("<strong>bold</strong>");
      expect(result).toContain("<em>italic</em>");
      expect(result).toContain("<ul>");
      expect(result).toContain('<a href="https://example.com">link</a>');
      expect(result).toContain("<pre><code class=\"language-javascript\">");
      expect(result).toContain("<blockquote>");
      expect(result).toContain("<table>");
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed markdown gracefully", () => {
      const malformedMarkdown = "```\nUnclosed code block";
      const result = transformMarkdown(malformedMarkdown);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("should handle very long markdown", () => {
      const longMarkdown = "# Title\n\n".repeat(1000) + "Content";
      const result = transformMarkdown(longMarkdown);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle special characters", () => {
      const markdown = "Special chars: & < > \" '";
      const result = transformMarkdown(markdown);

      expect(result).toBeDefined();
      expect(result).toContain("&amp;");
      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
    });
  });

  describe("Performance", () => {
    it("should handle large markdown files efficiently", () => {
      const largeMarkdown = Array.from({ length: 1000 }, (_, i) => 
        `# Section ${i}\n\nContent for section ${i}.\n\n`
      ).join("");

      const startTime = Date.now();
      const result = transformMarkdown(largeMarkdown);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
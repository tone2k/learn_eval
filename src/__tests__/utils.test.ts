import { describe, it, expect, vi } from 'vitest';
import { generateId, formatDate, truncateText, sanitizeTitle, isNewChatCreated } from '../utils';

describe('utils', () => {
  describe('generateId', () => {
    it('should generate a string', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate alphanumeric strings', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('formatDate', () => {
    it('should format a date correctly', () => {
      const date = new Date('2023-12-25T10:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/Dec 25, 2023/);
      expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Time format
    });

    it('should handle different date formats', () => {
      const date1 = new Date('2023-01-01T00:00:00Z');
      const date2 = new Date('2023-12-31T23:59:59Z');
      
      const formatted1 = formatDate(date1);
      const formatted2 = formatDate(date2);
      
      expect(formatted1).toMatch(/Jan 1, 2023/);
      expect(formatted2).toMatch(/Dec 31, 2023/);
    });

    it('should handle current date', () => {
      const now = new Date();
      const formatted = formatDate(now);
      expect(formatted).toMatch(/\d{4}/); // Year
      expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Time
    });
  });

  describe('truncateText', () => {
    it('should return original text if shorter than max length', () => {
      const text = 'Hello World';
      const result = truncateText(text, 20);
      expect(result).toBe(text);
    });

    it('should truncate text and add ellipsis', () => {
      const text = 'This is a very long text that needs to be truncated';
      const result = truncateText(text, 20);
      expect(result).toBe('This is a very long...');
      expect(result.length).toBe(20);
    });

    it('should handle exact length', () => {
      const text = 'Exactly ten chars';
      const result = truncateText(text, 10);
      expect(result).toBe('Exactly...');
    });

    it('should handle empty string', () => {
      const result = truncateText('', 10);
      expect(result).toBe('');
    });

    it('should handle zero max length', () => {
      const text = 'Hello';
      const result = truncateText(text, 0);
      expect(result).toBe('...');
    });

    it('should handle negative max length', () => {
      const text = 'Hello';
      const result = truncateText(text, -5);
      expect(result).toBe('...');
    });
  });

  describe('sanitizeTitle', () => {
    it('should extract first line and truncate', () => {
      const content = 'First line\nSecond line\nThird line';
      const result = sanitizeTitle(content);
      expect(result).toBe('First line');
    });

    it('should handle single line content', () => {
      const content = 'Single line content';
      const result = sanitizeTitle(content);
      expect(result).toBe('Single line content');
    });

    it('should truncate long first line', () => {
      const content = 'This is a very long first line that exceeds the maximum allowed length of fifty characters';
      const result = sanitizeTitle(content);
      expect(result).toBe('This is a very long first line that exceeds the...');
      expect(result.length).toBe(50);
    });

    it('should handle empty content', () => {
      const result = sanitizeTitle('');
      expect(result).toBe('New Chat');
    });

    it('should handle whitespace-only content', () => {
      const result = sanitizeTitle('   \n  \t  ');
      expect(result).toBe('New Chat');
    });

    it('should trim whitespace from first line', () => {
      const content = '   Trimmed line   \nSecond line';
      const result = sanitizeTitle(content);
      expect(result).toBe('Trimmed line');
    });

    it('should handle content with only newlines', () => {
      const content = '\n\n\n';
      const result = sanitizeTitle(content);
      expect(result).toBe('New Chat');
    });
  });

  describe('isNewChatCreated', () => {
    it('should return true for valid NEW_CHAT_CREATED data', () => {
      const data = {
        type: 'NEW_CHAT_CREATED',
        chatId: 'test-chat-id'
      };
      expect(isNewChatCreated(data)).toBe(true);
    });

    it('should return false for different type', () => {
      const data = {
        type: 'DIFFERENT_TYPE',
        chatId: 'test-chat-id'
      };
      expect(isNewChatCreated(data)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isNewChatCreated(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isNewChatCreated(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isNewChatCreated('string')).toBe(false);
      expect(isNewChatCreated(123)).toBe(false);
      expect(isNewChatCreated(true)).toBe(false);
    });

    it('should return false for object without type property', () => {
      const data = { chatId: 'test-chat-id' };
      expect(isNewChatCreated(data)).toBe(false);
    });

    it('should return false for object with different type value', () => {
      const data = { type: 'OTHER_TYPE', chatId: 'test-chat-id' };
      expect(isNewChatCreated(data)).toBe(false);
    });

    it('should return true for object with extra properties', () => {
      const data = {
        type: 'NEW_CHAT_CREATED',
        chatId: 'test-chat-id',
        extraProp: 'extra value'
      };
      expect(isNewChatCreated(data)).toBe(true);
    });
  });
});
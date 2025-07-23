import { describe, it, expect } from 'vitest';
import type { 
  ChatMessage, 
  Chat, 
  UserLocation, 
  User, 
  SearchResult, 
  WebSearchResponse, 
  SearchAction, 
  AnswerAction, 
  Action,
  SummarizeURLInput,
  SummarizeURLResult,
  OurMessageAnnotation
} from '../types';

describe('types', () => {
  describe('ChatMessage', () => {
    it('should allow valid ChatMessage objects', () => {
      const validMessage: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello, world!',
        createdAt: new Date(),
      };

      expect(validMessage.id).toBe('msg-1');
      expect(validMessage.role).toBe('user');
      expect(validMessage.content).toBe('Hello, world!');
      expect(validMessage.createdAt).toBeInstanceOf(Date);
    });

    it('should allow assistant role', () => {
      const assistantMessage: ChatMessage = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hello! How can I help you?',
      };

      expect(assistantMessage.role).toBe('assistant');
    });

    it('should allow system role', () => {
      const systemMessage: ChatMessage = {
        id: 'msg-3',
        role: 'system',
        content: 'You are a helpful assistant.',
      };

      expect(systemMessage.role).toBe('system');
    });
  });

  describe('Chat', () => {
    it('should allow valid Chat objects', () => {
      const validChat: Chat = {
        id: 'chat-1',
        title: 'Test Chat',
        userId: 'user-1',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(validChat.id).toBe('chat-1');
      expect(validChat.title).toBe('Test Chat');
      expect(validChat.userId).toBe('user-1');
      expect(validChat.messages).toEqual([]);
      expect(validChat.createdAt).toBeInstanceOf(Date);
      expect(validChat.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow optional updatedAt', () => {
      const chatWithoutUpdatedAt: Chat = {
        id: 'chat-2',
        title: 'Test Chat 2',
        userId: 'user-1',
        messages: [],
        createdAt: new Date(),
      };

      expect(chatWithoutUpdatedAt.updatedAt).toBeUndefined();
    });
  });

  describe('UserLocation', () => {
    it('should allow valid UserLocation objects', () => {
      const validLocation: UserLocation = {
        latitude: '37.7749',
        longitude: '-122.4194',
        city: 'San Francisco',
        country: 'US',
      };

      expect(validLocation.latitude).toBe('37.7749');
      expect(validLocation.longitude).toBe('-122.4194');
      expect(validLocation.city).toBe('San Francisco');
      expect(validLocation.country).toBe('US');
    });

    it('should allow partial location data', () => {
      const partialLocation: UserLocation = {
        country: 'US',
      };

      expect(partialLocation.country).toBe('US');
      expect(partialLocation.latitude).toBeUndefined();
      expect(partialLocation.longitude).toBeUndefined();
      expect(partialLocation.city).toBeUndefined();
    });
  });

  describe('User', () => {
    it('should allow valid User objects', () => {
      const validUser: User = {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://example.com/avatar.jpg',
        isAdmin: false,
      };

      expect(validUser.id).toBe('user-1');
      expect(validUser.name).toBe('John Doe');
      expect(validUser.email).toBe('john@example.com');
      expect(validUser.image).toBe('https://example.com/avatar.jpg');
      expect(validUser.isAdmin).toBe(false);
    });

    it('should allow optional name and image', () => {
      const minimalUser: User = {
        id: 'user-2',
        email: 'jane@example.com',
        isAdmin: true,
      };

      expect(minimalUser.name).toBeUndefined();
      expect(minimalUser.image).toBeUndefined();
    });
  });

  describe('SearchResult', () => {
    it('should allow valid SearchResult objects', () => {
      const validResult: SearchResult = {
        title: 'Test Result',
        url: 'https://example.com',
        snippet: 'This is a test snippet',
        position: 1,
        date: '2023-12-25',
      };

      expect(validResult.title).toBe('Test Result');
      expect(validResult.url).toBe('https://example.com');
      expect(validResult.snippet).toBe('This is a test snippet');
      expect(validResult.position).toBe(1);
      expect(validResult.date).toBe('2023-12-25');
    });

    it('should allow optional date', () => {
      const resultWithoutDate: SearchResult = {
        title: 'Test Result',
        url: 'https://example.com',
        snippet: 'This is a test snippet',
        position: 1,
      };

      expect(resultWithoutDate.date).toBeUndefined();
    });
  });

  describe('WebSearchResponse', () => {
    it('should allow valid WebSearchResponse objects', () => {
      const validResponse: WebSearchResponse = {
        query: 'test query',
        results: [
          {
            title: 'Result 1',
            url: 'https://example1.com',
            snippet: 'Snippet 1',
            position: 1,
          },
          {
            title: 'Result 2',
            url: 'https://example2.com',
            snippet: 'Snippet 2',
            position: 2,
          },
        ],
        totalResults: 2,
      };

      expect(validResponse.query).toBe('test query');
      expect(validResponse.results).toHaveLength(2);
      expect(validResponse.totalResults).toBe(2);
    });
  });

  describe('SearchAction', () => {
    it('should allow valid SearchAction objects', () => {
      const validSearchAction: SearchAction = {
        type: 'search',
        title: 'Search for information',
        reasoning: 'Need to find relevant data',
        query: 'test query',
      };

      expect(validSearchAction.type).toBe('search');
      expect(validSearchAction.title).toBe('Search for information');
      expect(validSearchAction.reasoning).toBe('Need to find relevant data');
      expect(validSearchAction.query).toBe('test query');
    });
  });

  describe('AnswerAction', () => {
    it('should allow valid AnswerAction objects', () => {
      const validAnswerAction: AnswerAction = {
        type: 'answer',
        title: 'Provide answer',
        reasoning: 'Based on the search results',
      };

      expect(validAnswerAction.type).toBe('answer');
      expect(validAnswerAction.title).toBe('Provide answer');
      expect(validAnswerAction.reasoning).toBe('Based on the search results');
    });
  });

  describe('Action union type', () => {
    it('should allow SearchAction', () => {
      const searchAction: Action = {
        type: 'search',
        title: 'Search for information',
        reasoning: 'Need to find relevant data',
        query: 'test query',
      };

      expect(searchAction.type).toBe('search');
    });

    it('should allow AnswerAction', () => {
      const answerAction: Action = {
        type: 'answer',
        title: 'Provide answer',
        reasoning: 'Based on the search results',
      };

      expect(answerAction.type).toBe('answer');
    });
  });

  describe('SummarizeURLInput', () => {
    it('should allow valid SummarizeURLInput objects', () => {
      const validInput: SummarizeURLInput = {
        conversationHistory: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Summarize this URL',
          },
        ],
        scrapedContent: 'This is the scraped content from the URL',
        searchMetadata: {
          title: 'Test Page',
          url: 'https://example.com',
          snippet: 'Test snippet',
          date: '2023-12-25',
        },
        query: 'test query',
      };

      expect(validInput.conversationHistory).toHaveLength(1);
      expect(validInput.scrapedContent).toBe('This is the scraped content from the URL');
      expect(validInput.searchMetadata.title).toBe('Test Page');
      expect(validInput.query).toBe('test query');
    });
  });

  describe('SummarizeURLResult', () => {
    it('should allow valid SummarizeURLResult objects', () => {
      const validResult: SummarizeURLResult = {
        summary: 'This is a summary of the URL content',
        url: 'https://example.com',
      };

      expect(validResult.summary).toBe('This is a summary of the URL content');
      expect(validResult.url).toBe('https://example.com');
    });
  });

  describe('OurMessageAnnotation', () => {
    it('should allow valid OurMessageAnnotation objects with SearchAction', () => {
      const validAnnotation: OurMessageAnnotation = {
        type: 'NEW_ACTION',
        action: {
          type: 'search',
          title: 'Search for information',
          reasoning: 'Need to find relevant data',
          query: 'test query',
        },
      };

      expect(validAnnotation.type).toBe('NEW_ACTION');
      expect(validAnnotation.action.type).toBe('search');
    });

    it('should allow valid OurMessageAnnotation objects with AnswerAction', () => {
      const validAnnotation: OurMessageAnnotation = {
        type: 'NEW_ACTION',
        action: {
          type: 'answer',
          title: 'Provide answer',
          reasoning: 'Based on the search results',
        },
      };

      expect(validAnnotation.type).toBe('NEW_ACTION');
      expect(validAnnotation.action.type).toBe('answer');
    });
  });
});
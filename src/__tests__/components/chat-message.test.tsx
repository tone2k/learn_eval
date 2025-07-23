import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from '../../components/chat-message';
import type { OurMessageAnnotation } from '../../types';

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

// Mock ReasoningSteps component
vi.mock('../../components/reasoning-steps', () => ({
  ReasoningSteps: ({ annotations }: { annotations: OurMessageAnnotation[] }) => (
    <div data-testid="reasoning-steps">
      {annotations.map((ann, index) => (
        <div key={index} data-testid={`annotation-${index}`}>
          {ann.type}: {ann.action.title}
        </div>
      ))}
    </div>
  ),
}));

describe('ChatMessage', () => {
  const defaultProps = {
    parts: [],
    role: 'user',
    userName: 'Test User',
    annotations: [],
  };

  it('should render user message correctly', () => {
    render(<ChatMessage {...defaultProps} />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('No content')).toBeInTheDocument();
    expect(screen.queryByTestId('reasoning-steps')).not.toBeInTheDocument();
  });

  it('should render AI message correctly', () => {
    render(<ChatMessage {...defaultProps} role="assistant" />);

    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('No content')).toBeInTheDocument();
  });

  it('should render text parts correctly', () => {
    const props = {
      ...defaultProps,
      parts: [
        { type: 'text', text: 'Hello, this is a test message' }
      ],
    };

    render(<ChatMessage {...props} />);

    expect(screen.getByTestId('markdown')).toBeInTheDocument();
    expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
  });

  it('should render tool invocation parts correctly', () => {
    const props = {
      ...defaultProps,
      parts: [
        {
          type: 'tool-invocation',
          toolInvocation: {
            toolName: 'search',
            args: { query: 'test query' }
          }
        }
      ],
    };

    render(<ChatMessage {...props} />);

    expect(screen.getByText('🔧 Using tool: search')).toBeInTheDocument();
    expect(screen.getByText(JSON.stringify({ query: 'test query' }, null, 2))).toBeInTheDocument();
  });

  it('should render mixed parts correctly', () => {
    const props = {
      ...defaultProps,
      parts: [
        { type: 'text', text: 'I will search for information' },
        {
          type: 'tool-invocation',
          toolInvocation: {
            toolName: 'search',
            args: { query: 'test query' }
          }
        },
        { type: 'text', text: 'Here are the results' }
      ],
    };

    render(<ChatMessage {...props} />);

    expect(screen.getByText('I will search for information')).toBeInTheDocument();
    expect(screen.getByText('🔧 Using tool: search')).toBeInTheDocument();
    expect(screen.getByText('Here are the results')).toBeInTheDocument();
  });

  it('should render reasoning steps for AI messages with annotations', () => {
    const annotations: OurMessageAnnotation[] = [
      {
        type: 'NEW_ACTION',
        action: {
          type: 'search',
          title: 'Search for information',
          reasoning: 'Need to find relevant data',
          query: 'test query'
        }
      },
      {
        type: 'NEW_ACTION',
        action: {
          type: 'answer',
          title: 'Provide answer',
          reasoning: 'Based on search results'
        }
      }
    ];

    const props = {
      ...defaultProps,
      role: 'assistant',
      annotations,
    };

    render(<ChatMessage {...props} />);

    expect(screen.getByTestId('reasoning-steps')).toBeInTheDocument();
    expect(screen.getByTestId('annotation-0')).toBeInTheDocument();
    expect(screen.getByTestId('annotation-1')).toBeInTheDocument();
    expect(screen.getByText('NEW_ACTION: Search for information')).toBeInTheDocument();
    expect(screen.getByText('NEW_ACTION: Provide answer')).toBeInTheDocument();
  });

  it('should not render reasoning steps for user messages', () => {
    const annotations: OurMessageAnnotation[] = [
      {
        type: 'NEW_ACTION',
        action: {
          type: 'search',
          title: 'Search for information',
          reasoning: 'Need to find relevant data',
          query: 'test query'
        }
      }
    ];

    const props = {
      ...defaultProps,
      role: 'user',
      annotations,
    };

    render(<ChatMessage {...props} />);

    expect(screen.queryByTestId('reasoning-steps')).not.toBeInTheDocument();
  });

  it('should filter annotations to only NEW_ACTION type', () => {
    const annotations: OurMessageAnnotation[] = [
      {
        type: 'NEW_ACTION',
        action: {
          type: 'search',
          title: 'Search for information',
          reasoning: 'Need to find relevant data',
          query: 'test query'
        }
      },
      {
        type: 'OTHER_TYPE' as any,
        action: {
          type: 'search',
          title: 'This should be filtered out',
          reasoning: 'Should not appear',
          query: 'test'
        }
      }
    ];

    const props = {
      ...defaultProps,
      role: 'assistant',
      annotations,
    };

    render(<ChatMessage {...props} />);

    expect(screen.getByTestId('reasoning-steps')).toBeInTheDocument();
    expect(screen.getByText('NEW_ACTION: Search for information')).toBeInTheDocument();
    expect(screen.queryByText('OTHER_TYPE: This should be filtered out')).not.toBeInTheDocument();
  });

  it('should handle unknown part types gracefully', () => {
    const props = {
      ...defaultProps,
      parts: [
        { type: 'unknown-type', data: 'some data' }
      ],
    };

    render(<ChatMessage {...props} />);

    // Should fall back to "No content" when parts don't contain recognized types
    expect(screen.getByText('No content')).toBeInTheDocument();
  });

  it('should apply correct CSS classes for user vs AI messages', () => {
    const { rerender } = render(<ChatMessage {...defaultProps} role="user" />);
    
    const userMessage = screen.getByText('Test User').closest('div');
    expect(userMessage).toHaveClass('bg-gray-900');

    rerender(<ChatMessage {...defaultProps} role="assistant" />);
    
    const aiMessage = screen.getByText('AI').closest('div');
    expect(aiMessage).toHaveClass('bg-gray-800');
  });

  it('should handle empty parts array', () => {
    render(<ChatMessage {...defaultProps} parts={[]} />);

    expect(screen.getByText('No content')).toBeInTheDocument();
  });

  it('should handle null or undefined parts', () => {
    render(<ChatMessage {...defaultProps} parts={null as any} />);

    expect(screen.getByText('No content')).toBeInTheDocument();
  });
});
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReasoningSteps } from '../../components/reasoning-steps';
import type { OurMessageAnnotation } from '../../types';

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  SearchIcon: ({ className }: { className?: string }) => (
    <div data-testid="search-icon" className={className}>🔍</div>
  ),
}));

describe('ReasoningSteps', () => {
  const mockAnnotations: OurMessageAnnotation[] = [
    {
      type: 'NEW_ACTION',
      action: {
        type: 'search',
        title: 'Search for information',
        reasoning: 'Need to find relevant data about the topic',
        query: 'test query'
      }
    },
    {
      type: 'NEW_ACTION',
      action: {
        type: 'answer',
        title: 'Provide answer',
        reasoning: 'Based on the search results, I can now provide a comprehensive answer'
      }
    }
  ];

  it('should render nothing when annotations array is empty', () => {
    const { container } = render(<ReasoningSteps annotations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render all annotation steps', () => {
    render(<ReasoningSteps annotations={mockAnnotations} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Search for information')).toBeInTheDocument();
    expect(screen.getByText('Provide answer')).toBeInTheDocument();
  });

  it('should show step numbers correctly', () => {
    render(<ReasoningSteps annotations={mockAnnotations} />);

    const stepNumbers = screen.getAllByText(/^[12]$/);
    expect(stepNumbers).toHaveLength(2);
    expect(stepNumbers[0]).toHaveTextContent('1');
    expect(stepNumbers[1]).toHaveTextContent('2');
  });

  it('should toggle step details when clicked', () => {
    render(<ReasoningSteps annotations={mockAnnotations} />);

    const firstStepButton = screen.getByText('Search for information').closest('button');
    expect(firstStepButton).toBeInTheDocument();

    // Initially, details should be hidden
    expect(screen.queryByText('Need to find relevant data about the topic')).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(firstStepButton!);
    expect(screen.getByText('Need to find relevant data about the topic')).toBeInTheDocument();
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    expect(screen.getByText('test query')).toBeInTheDocument();

    // Click to close
    fireEvent.click(firstStepButton!);
    expect(screen.queryByText('Need to find relevant data about the topic')).not.toBeInTheDocument();
  });

  it('should show search query for search actions', () => {
    render(<ReasoningSteps annotations={mockAnnotations} />);

    const firstStepButton = screen.getByText('Search for information').closest('button');
    fireEvent.click(firstStepButton!);

    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    expect(screen.getByText('test query')).toBeInTheDocument();
  });

  it('should not show search query for non-search actions', () => {
    render(<ReasoningSteps annotations={mockAnnotations} />);

    const secondStepButton = screen.getByText('Provide answer').closest('button');
    fireEvent.click(secondStepButton!);

    expect(screen.queryByTestId('search-icon')).not.toBeInTheDocument();
    expect(screen.queryByText('test query')).not.toBeInTheDocument();
  });

  it('should only allow one step to be open at a time', () => {
    render(<ReasoningSteps annotations={mockAnnotations} />);

    const firstStepButton = screen.getByText('Search for information').closest('button');
    const secondStepButton = screen.getByText('Provide answer').closest('button');

    // Open first step
    fireEvent.click(firstStepButton!);
    expect(screen.getByText('Need to find relevant data about the topic')).toBeInTheDocument();

    // Open second step
    fireEvent.click(secondStepButton!);
    expect(screen.queryByText('Need to find relevant data about the topic')).not.toBeInTheDocument();
    expect(screen.getByText('Based on the search results, I can now provide a comprehensive answer')).toBeInTheDocument();
  });

  it('should apply correct styling classes for open/closed states', () => {
    render(<ReasoningSteps annotations={mockAnnotations} />);

    const firstStepButton = screen.getByText('Search for information').closest('button');
    const stepNumber = screen.getByText('1').closest('span');

    // Initially closed
    expect(firstStepButton).toHaveClass('text-gray-400');
    expect(stepNumber).toHaveClass('bg-gray-800');

    // Open the step
    fireEvent.click(firstStepButton!);
    expect(firstStepButton).toHaveClass('bg-gray-700');
    expect(stepNumber).toHaveClass('border-blue-400');
  });

  it('should handle markdown content in reasoning', () => {
    const annotationsWithMarkdown: OurMessageAnnotation[] = [
      {
        type: 'NEW_ACTION',
        action: {
          type: 'answer',
          title: 'Markdown Test',
          reasoning: 'This is **bold** and *italic* text with `code`'
        }
      }
    ];

    render(<ReasoningSteps annotations={annotationsWithMarkdown} />);

    const stepButton = screen.getByText('Markdown Test').closest('button');
    fireEvent.click(stepButton!);

    expect(screen.getByTestId('markdown')).toBeInTheDocument();
    expect(screen.getByText('This is **bold** and *italic* text with `code`')).toBeInTheDocument();
  });

  it('should handle long reasoning text', () => {
    const longReasoning = 'This is a very long reasoning text that might contain a lot of content and should be displayed properly without any truncation or formatting issues. It should wrap correctly and maintain readability.';
    
    const annotationsWithLongReasoning: OurMessageAnnotation[] = [
      {
        type: 'NEW_ACTION',
        action: {
          type: 'answer',
          title: 'Long Reasoning Test',
          reasoning: longReasoning
        }
      }
    ];

    render(<ReasoningSteps annotations={annotationsWithLongReasoning} />);

    const stepButton = screen.getByText('Long Reasoning Test').closest('button');
    fireEvent.click(stepButton!);

    expect(screen.getByText(longReasoning)).toBeInTheDocument();
  });

  it('should handle special characters in titles and reasoning', () => {
    const specialAnnotations: OurMessageAnnotation[] = [
      {
        type: 'NEW_ACTION',
        action: {
          type: 'search',
          title: 'Special chars: !@#$%^&*()',
          reasoning: 'Reasoning with <script>alert("xss")</script> content',
          query: 'query with "quotes" and \'apostrophes\''
        }
      }
    ];

    render(<ReasoningSteps annotations={specialAnnotations} />);

    expect(screen.getByText('Special chars: !@#$%^&*()')).toBeInTheDocument();

    const stepButton = screen.getByText('Special chars: !@#$%^&*()').closest('button');
    fireEvent.click(stepButton!);

    expect(screen.getByText('Reasoning with <script>alert("xss")</script> content')).toBeInTheDocument();
    expect(screen.getByText('query with "quotes" and \'apostrophes\'')).toBeInTheDocument();
  });

  it('should handle keyboard interaction', () => {
    render(<ReasoningSteps annotations={mockAnnotations} />);

    const firstStepButton = screen.getByText('Search for information').closest('button');
    
    // Test Enter key
    fireEvent.keyDown(firstStepButton!, { key: 'Enter' });
    expect(screen.getByText('Need to find relevant data about the topic')).toBeInTheDocument();

    // Test Space key
    fireEvent.keyDown(firstStepButton!, { key: ' ' });
    expect(screen.queryByText('Need to find relevant data about the topic')).not.toBeInTheDocument();
  });
});
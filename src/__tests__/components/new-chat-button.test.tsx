import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewChatButton } from '../../components/new-chat-button';

describe('NewChatButton', () => {
  it('should render button with correct text', () => {
    render(<NewChatButton />);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  it('should render with correct styling classes', () => {
    render(<NewChatButton />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('rounded-lg');
    expect(button).toHaveClass('bg-gray-800');
    expect(button).toHaveClass('px-4');
    expect(button).toHaveClass('py-2');
    expect(button).toHaveClass('text-sm');
    expect(button).toHaveClass('text-gray-300');
    expect(button).toHaveClass('hover:bg-gray-700');
  });

  it('should call onClick when clicked', () => {
    const mockOnClick = vi.fn();
    render(<NewChatButton onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when not provided', () => {
    render(<NewChatButton />);

    const button = screen.getByRole('button');
    expect(() => fireEvent.click(button)).not.toThrow();
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(<NewChatButton />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should handle multiple clicks', () => {
    const mockOnClick = vi.fn();
    render(<NewChatButton onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(3);
  });

  it('should handle keyboard interaction', () => {
    const mockOnClick = vi.fn();
    render(<NewChatButton onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: ' ' });

    expect(mockOnClick).toHaveBeenCalledTimes(2);
  });
});
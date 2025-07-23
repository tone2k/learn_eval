import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewChatButton } from '../../components/new-chat-button';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  PlusIcon: ({ className }: { className?: string }) => (
    <div data-testid="plus-icon" className={className}>+</div>
  ),
}));

describe('NewChatButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render button with correct icon', () => {
    render(<NewChatButton />);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
  });

  it('should render with correct styling classes', () => {
    render(<NewChatButton />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('flex');
    expect(button).toHaveClass('h-8');
    expect(button).toHaveClass('w-8');
    expect(button).toHaveClass('items-center');
    expect(button).toHaveClass('justify-center');
    expect(button).toHaveClass('rounded-lg');
    expect(button).toHaveClass('bg-gray-800');
    expect(button).toHaveClass('text-gray-300');
    expect(button).toHaveClass('hover:bg-gray-700');
    expect(button).toHaveClass('focus:outline-none');
    expect(button).toHaveClass('focus:ring-2');
    expect(button).toHaveClass('focus:ring-blue-400');
  });

  it('should have correct title attribute', () => {
    render(<NewChatButton />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'New Chat');
  });

  it('should navigate to home page when clicked', () => {
    render(<NewChatButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith('/');
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple clicks', () => {
    render(<NewChatButton />);

    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledTimes(3);
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should handle keyboard interaction', () => {
    render(<NewChatButton />);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: ' ' });

    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(<NewChatButton />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'New Chat');
  });
});
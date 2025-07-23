import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorMessage } from '../../components/error-message';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertCircle: ({ className }: { className?: string }) => (
    <div data-testid="alert-circle" className={className}>⚠️</div>
  ),
}));

describe('ErrorMessage', () => {
  it('should render error message correctly', () => {
    const message = 'This is a test error message';
    render(<ErrorMessage message={message} />);

    expect(screen.getByText('This is a test error message')).toBeInTheDocument();
  });

  it('should render with correct styling classes', () => {
    const message = 'Test error';
    render(<ErrorMessage message={message} />);

    const errorElement = screen.getByText('Test error');
    expect(errorElement.closest('div')).toHaveClass('bg-red-950');
    expect(errorElement.closest('div')).toHaveClass('text-red-300');
  });

  it('should handle empty error message', () => {
    render(<ErrorMessage message="" />);

    expect(screen.getByText('')).toBeInTheDocument();
  });

  it('should handle long error messages', () => {
    const longMessage = 'This is a very long error message that might contain a lot of text and should still be displayed properly without any truncation or formatting issues';
    render(<ErrorMessage message={longMessage} />);

    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it('should handle special characters in error message', () => {
    const specialMessage = 'Error with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
    render(<ErrorMessage message={specialMessage} />);

    expect(screen.getByText(specialMessage)).toBeInTheDocument();
  });

  it('should handle HTML-like content in error message', () => {
    const htmlMessage = 'Error with <script>alert("xss")</script> content';
    render(<ErrorMessage message={htmlMessage} />);

    expect(screen.getByText(htmlMessage)).toBeInTheDocument();
  });

  it('should include AlertCircle icon', () => {
    render(<ErrorMessage message="Test message" />);
    
    expect(screen.getByTestId('alert-circle')).toBeInTheDocument();
  });

  it('should have correct container structure', () => {
    render(<ErrorMessage message="Test message" />);
    
    const container = screen.getByText('Test message').closest('.mx-auto');
    expect(container).toHaveClass('mx-auto');
    expect(container).toHaveClass('w-full');
    expect(container).toHaveClass('max-w-[65ch]');
  });
});
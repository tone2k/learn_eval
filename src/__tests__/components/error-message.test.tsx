import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorMessage } from '../../components/error-message';

describe('ErrorMessage', () => {
  it('should render error message correctly', () => {
    const error = 'This is a test error message';
    render(<ErrorMessage error={error} />);

    expect(screen.getByText('This is a test error message')).toBeInTheDocument();
  });

  it('should render with correct styling classes', () => {
    const error = 'Test error';
    render(<ErrorMessage error={error} />);

    const errorElement = screen.getByText('Test error');
    expect(errorElement).toHaveClass('text-red-500');
    expect(errorElement.closest('div')).toHaveClass('text-center');
  });

  it('should handle empty error message', () => {
    render(<ErrorMessage error="" />);

    expect(screen.getByText('')).toBeInTheDocument();
  });

  it('should handle long error messages', () => {
    const longError = 'This is a very long error message that might contain a lot of text and should still be displayed properly without any truncation or formatting issues';
    render(<ErrorMessage error={longError} />);

    expect(screen.getByText(longError)).toBeInTheDocument();
  });

  it('should handle special characters in error message', () => {
    const specialError = 'Error with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
    render(<ErrorMessage error={specialError} />);

    expect(screen.getByText(specialError)).toBeInTheDocument();
  });

  it('should handle HTML-like content in error message', () => {
    const htmlError = 'Error with <script>alert("xss")</script> content';
    render(<ErrorMessage error={htmlError} />);

    expect(screen.getByText(htmlError)).toBeInTheDocument();
  });
});
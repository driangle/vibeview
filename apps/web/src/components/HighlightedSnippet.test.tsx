import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HighlightedSnippet } from './HighlightedSnippet';

describe('HighlightedSnippet', () => {
  it('highlights every case-insensitive match while preserving original text', () => {
    const { container } = render(<HighlightedSnippet snippet="Alpha alpha ALPHA" query="alpha" />);
    expect(screen.getAllByText(/alpha/i, { selector: 'mark' })).toHaveLength(3);
    expect(container.textContent).toBe('Alpha alpha ALPHA');
  });

  it('renders snippets containing regex characters literally', () => {
    render(<HighlightedSnippet snippet="Use a+b, not ab" query="a+b" />);
    expect(screen.getByText('a+b', { selector: 'mark' })).toBeInTheDocument();
  });

  it('renders an unchanged snippet when the query is empty or absent', () => {
    const { container, rerender } = render(<HighlightedSnippet snippet="plain text" query="" />);
    expect(container.querySelector('mark')).toBeNull();
    rerender(<HighlightedSnippet snippet="plain text" query="missing" />);
    expect(container.textContent).toBe('plain text');
    expect(container.querySelector('mark')).toBeNull();
  });
});

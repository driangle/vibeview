import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ActivityBadge } from './ActivityBadge';

describe('ActivityBadge', () => {
  it('renders nothing for idle state', () => {
    const { container } = render(<ActivityBadge state="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when state is undefined', () => {
    const { container } = render(<ActivityBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('renders "Working" label for working state', () => {
    render(<ActivityBadge state="working" />);
    expect(screen.getByText('Working')).toBeInTheDocument();
  });

  it('renders "Waiting for approval" label', () => {
    render(<ActivityBadge state="waiting_for_approval" />);
    expect(screen.getByText('Waiting for approval')).toBeInTheDocument();
  });

  it('renders "Waiting for input" label', () => {
    render(<ActivityBadge state="waiting_for_input" />);
    expect(screen.getByText('Waiting for input')).toBeInTheDocument();
  });

  it('applies pulse animation only to working state', () => {
    const { container } = render(<ActivityBadge state="working" />);
    const dot = container.querySelector('.rounded-full');
    expect(dot?.className).toContain('animate-pulse');
  });

  it('does not animate for non-working states', () => {
    const { container } = render(<ActivityBadge state="waiting_for_input" />);
    const dot = container.querySelector('.rounded-full');
    expect(dot?.className).not.toContain('animate-pulse');
  });
});

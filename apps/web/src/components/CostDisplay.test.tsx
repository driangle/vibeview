import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CostDisplay } from './CostDisplay';
import type { UsageTotals } from '../types';

function makeUsage(overrides: Partial<UsageTotals> = {}): UsageTotals {
  return {
    inputTokens: 1000,
    outputTokens: 500,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    costUSD: 0.05,
    ...overrides,
  };
}

describe('CostDisplay', () => {
  it('renders cost and token totals', () => {
    render(<CostDisplay usage={makeUsage()} />);
    expect(screen.getByText('$0.05')).toBeInTheDocument();
    expect(screen.getByText('1.5k tokens')).toBeInTheDocument();
  });

  it('returns null when all tokens are zero', () => {
    const { container } = render(
      <CostDisplay
        usage={makeUsage({
          inputTokens: 0,
          outputTokens: 0,
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 0,
        })}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows input and output token breakdown', () => {
    render(<CostDisplay usage={makeUsage({ inputTokens: 2000, outputTokens: 800 })} />);
    expect(screen.getByText('In: 2.0k')).toBeInTheDocument();
    expect(screen.getByText('Out: 800')).toBeInTheDocument();
  });

  it('shows cache read/write when non-zero', () => {
    render(
      <CostDisplay
        usage={makeUsage({ cacheReadInputTokens: 5000, cacheCreationInputTokens: 3000 })}
      />,
    );
    expect(screen.getByText('Cache read: 5.0k')).toBeInTheDocument();
    expect(screen.getByText('Cache write: 3.0k')).toBeInTheDocument();
  });

  it('hides cache fields when zero', () => {
    render(<CostDisplay usage={makeUsage()} />);
    expect(screen.queryByText(/Cache read/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cache write/)).not.toBeInTheDocument();
  });

  it('formats large token counts with M suffix', () => {
    render(<CostDisplay usage={makeUsage({ inputTokens: 2_500_000, outputTokens: 0 })} />);
    expect(screen.getByText('In: 2.5M')).toBeInTheDocument();
  });
});

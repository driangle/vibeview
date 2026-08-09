import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Exchange } from '../../types';

// Cost visibility comes from useCostUIEnabled (backed by /api/config). Mock it so
// the test can exercise both the hidden and shown paths without a server.
const flag = vi.hoisted(() => ({ costEnabled: false }));
vi.mock('../../hooks/useCostUIEnabled', () => ({
  useCostUIEnabled: () => flag.costEnabled,
}));

import { ExchangeSummary } from './ExchangeSummary';

const exchange: Exchange = {
  index: 0,
  startTime: '',
  endTime: '',
  durationMs: 45_000,
  idleBeforeMs: 0,
  promptPreview: 'do the thing',
  model: 'claude-opus-4-8',
  tokens: 12_000,
  costUSD: 0.42,
  tools: [],
  files: [],
  commands: [],
  skills: [],
  flags: { hasErrors: false, deepThinking: false, hasSubagents: false, approvalGate: false },
  messageUuids: [],
};

afterEach(cleanup);

describe('ExchangeSummary cost gating', () => {
  it('hides the cost tile when cost display is disabled', () => {
    flag.costEnabled = false;
    render(<ExchangeSummary exchange={exchange} />);
    expect(screen.getByText('12.0k')).toBeInTheDocument(); // tokens tile still shows
    expect(screen.queryByText('$0.42')).toBeNull();
    expect(screen.queryByText('cost')).toBeNull();
  });

  it('shows the cost tile when cost display is enabled', () => {
    flag.costEnabled = true;
    render(<ExchangeSummary exchange={exchange} />);
    expect(screen.getByText('$0.42')).toBeInTheDocument();
    expect(screen.getByText('cost')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionDetail } from '../types';
import { defaults } from '../contexts/useSettings';
import { StaticSessionApp } from './StaticSessionApp';
import type { ExportPayload } from './payload';

const sessionId = '877fff1e-80c9-4d20-a600-f278eb2c7bdc';

const session = {
  id: sessionId,
  dir: '/users/me/project',
  customTitle: '',
  slug: 'Deploy the site',
  timestamp: '2026-08-03T09:00:00Z',
  model: 'claude-sonnet-4-20250514',
  messageCount: 2,
  activityState: 'idle',
  filePath: '~/.claude/projects/-users-me-project/session.jsonl',
  usage: {
    inputTokens: 1200,
    outputTokens: 340,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    costUSD: 0.05,
  },
  messages: [
    {
      uuid: 'u1',
      type: 'user',
      timestamp: '2026-08-03T09:00:00Z',
      message: { role: 'user', content: [{ type: 'text', text: 'deploy the site please' }] },
    },
    {
      uuid: 'a1',
      type: 'assistant',
      timestamp: '2026-08-03T09:00:10Z',
      message: {
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [
          { type: 'text', text: 'Running the build.' },
          { type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'npm run build' } },
        ],
      },
    },
  ],
} as unknown as SessionDetail;

const payload: ExportPayload = {
  sessionId,
  session,
  config: { costEnabled: true },
  settings: defaults,
  subagents: {},
};

describe('StaticSessionApp', () => {
  beforeEach(() => {
    // An exported page has no server. Anything that reaches the network is a bug.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('exported page attempted a network request');
      }),
    );
    vi.stubGlobal(
      'EventSource',
      class {
        close() {}
        addEventListener() {}
        removeEventListener() {}
      },
    );
  });

  it('renders the conversation and tool calls from the embedded payload', async () => {
    render(<StaticSessionApp payload={payload} />);

    expect(await screen.findByText('deploy the site please')).toBeInTheDocument();
    expect(screen.getByText('Running the build.')).toBeInTheDocument();
    expect(screen.getByText(/npm run build/)).toBeInTheDocument();
  });

  it('shows the session token total', async () => {
    render(<StaticSessionApp payload={payload} />);

    // 1200 + 340 tokens, rendered in the header's compact form.
    expect(await screen.findByText(/1\.5k/)).toBeInTheDocument();
  });

  it('omits conversation search, which needs a running server', async () => {
    render(<StaticSessionApp payload={payload} />);

    await screen.findByText('deploy the site please');
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import type { Exchange, MessageResponse } from '../../types';
import { ExchangeDetailPanel } from './ExchangeDetailPanel';
import type { SessionMessageContext } from './exchangeData';

function makeExchange(overrides: Partial<Exchange> & { index: number }): Exchange {
  return {
    startTime: '2026-08-03T09:12:00Z',
    endTime: '2026-08-03T09:13:00Z',
    durationMs: 45_000,
    idleBeforeMs: 0,
    promptPreview: 'Wire up the timeline',
    model: 'claude-opus-4-8',
    tokens: 12_000,
    costUSD: 0.42,
    tools: ['Bash'],
    files: ['apps/web/src/pages/SessionView.tsx'],
    commands: ['npm run typeCheck'],
    skills: [],
    flags: { hasErrors: true, deepThinking: false, hasSubagents: false, approvalGate: false },
    messageUuids: ['u1'],
    ...overrides,
  };
}

function userMessage(uuid: string, text: string): MessageResponse {
  return {
    uuid,
    type: 'user',
    timestamp: '2026-08-03T09:12:00Z',
    message: { role: 'user', content: text },
  };
}

function makeContext(messages: MessageResponse[]): SessionMessageContext {
  return {
    messages,
    toolResults: new Map(),
    agentGroups: new Map(),
    agentGroupFirstIds: new Set(),
  };
}

function renderPanel(props: Partial<Parameters<typeof ExchangeDetailPanel>[0]> = {}) {
  const exchange = props.exchange ?? makeExchange({ index: 6 });
  const context =
    props.context ?? makeContext([userMessage('u1', 'hello timeline'), userMessage('u2', 'other')]);
  const merged = {
    exchange,
    context,
    onClose: vi.fn(),
    onOpenInConversation: vi.fn(),
    ...props,
  };
  render(
    <MemoryRouter>
      <ExchangeDetailPanel {...merged} />
    </MemoryRouter>,
  );
  return merged;
}

describe('ExchangeDetailPanel', () => {
  it('renders the selected exchange fields', () => {
    renderPanel();
    expect(screen.getByText('Exchange 7')).toBeInTheDocument(); // index 6 -> "Exchange 7"
    expect(screen.getByText('Wire up the timeline')).toBeInTheDocument();
    expect(screen.getByText('45s')).toBeInTheDocument(); // elapsed tile
    expect(screen.getByText('12.0k')).toBeInTheDocument(); // tokens tile
    // Cost display is disabled via COST_UI_ENABLED — the cost tile is not rendered.
    expect(screen.queryByText('$0.42')).toBeNull();
    expect(screen.getByText('Error in results')).toBeInTheDocument(); // flag badge
    expect(screen.getByText('npm run typeCheck')).toBeInTheDocument(); // command
    expect(screen.getByText('apps/web/src/pages/SessionView.tsx')).toBeInTheDocument(); // file
  });

  it('resolves and renders only the messages named in messageUuids', () => {
    renderPanel();
    // Exchange references only "u1"; "u2" belongs to another exchange.
    expect(screen.getByText('hello timeline')).toBeInTheDocument();
    expect(screen.queryByText('other')).toBeNull();
  });

  it('calls prev/next when the header steppers are clicked', async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    renderPanel({ onPrev, onNext });

    await user.click(screen.getByLabelText('Previous exchange'));
    await user.click(screen.getByLabelText('Next exchange'));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('disables prev/next when no handler is supplied (list ends)', () => {
    renderPanel({ onPrev: undefined, onNext: undefined });
    expect(screen.getByLabelText('Previous exchange')).toBeDisabled();
    expect(screen.getByLabelText('Next exchange')).toBeDisabled();
  });

  it('closes on Escape, as a modal overlay', async () => {
    const user = userEvent.setup();
    const { onClose } = renderPanel();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose and onOpenInConversation from the header and footer', async () => {
    const user = userEvent.setup();
    const { onClose, onOpenInConversation } = renderPanel();

    await user.click(screen.getByLabelText('Close'));
    await user.click(screen.getByText('Open in conversation'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenInConversation).toHaveBeenCalledTimes(1);
  });
});

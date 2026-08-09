import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import type { MessageResponse } from '../types';
import { SessionViewHeader } from './SessionViewHeader';

/** Two messages ~10 minutes apart, so the client wall-clock differs from the span. */
const messages = [
  { uuid: 'a', timestamp: '2026-08-03T09:00:00Z' },
  { uuid: 'b', timestamp: '2026-08-03T09:10:00Z' },
] as unknown as MessageResponse[];

function renderHeader(sessionDurationMs: number | null) {
  return render(
    <MemoryRouter>
      <SessionViewHeader
        sessionId="abcdef123456"
        title="Test session"
        dir="/tmp/project"
        timestamp="2026-08-03T09:00:00Z"
        activityState="idle"
        liveUsage={null}
        displayMessages={messages}
        sessionDurationMs={sessionDurationMs}
        onExportPdf={() => {}}
        focusedAgentId={null}
        onExitAgent={() => {}}
        subagentData={undefined}
        subagentLoading={false}
        subagentDisplayMessages={[]}
        focusedAgentPrompt=""
      />
    </MemoryRouter>,
  );
}

describe('SessionViewHeader duration', () => {
  it('renders the server-provided span, not the client wall-clock', () => {
    // 457s span → "7m 37s". The message wall-clock would be "10m 0s"; the span wins.
    renderHeader(457_000);
    expect(screen.getByText(/7m 37s/)).toBeInTheDocument();
    expect(screen.queryByText(/10m 0s/)).not.toBeInTheDocument();
  });

  it('falls back to the message wall-clock when no span is available', () => {
    renderHeader(null);
    expect(screen.getByText(/10m 0s/)).toBeInTheDocument();
  });
});

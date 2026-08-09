import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ContentBlock,
  ContentBlockInput,
  Exchange,
  SessionInsights,
  TimelineInsights,
  TimelineResponse,
} from '../../types';
import type { TimelineController } from '../timeline-track/useTimeline';
import { useTimeline } from '../timeline-track/useTimeline';
import { TimelineTab } from '../timeline-track/TimelineTab';
import { TimelineSearch } from '../timeline-track/TimelineSearch';
import { SessionInsightsSidebar } from './SessionInsightsSidebar';
import { buildConversationActions, buildTimelineActions } from './actions';

const input = {} as ContentBlockInput;

const sessionInsights: SessionInsights = {
  tools: [
    { name: 'Read', count: 12 },
    { name: 'Edit', count: 7 },
  ],
  commands: [{ command: 'npm run lint', toolUseId: 't1', messageUuid: 'c1' }],
  errors: [{ toolName: 'Bash', snippet: 'boom', messageUuid: 'err-1' }],
  files: {
    categories: { written: ['apps/web/src/App.tsx'], read: ['apps/web/src/index.ts'] },
    entries: [
      {
        toolUseId: 'f1',
        toolName: 'Write',
        filePath: 'apps/web/src/App.tsx',
        input,
        timestamp: '',
        messageUuid: 'file-1',
      },
      {
        toolUseId: 'f2',
        toolName: 'Read',
        filePath: 'apps/web/src/index.ts',
        input,
        timestamp: '',
        messageUuid: 'file-2',
      },
    ],
  },
  worktrees: [{ name: 'wt', path: '/tmp/wt', branch: 'feat/x', messageUuid: 'w1' }],
  skills: [{ name: 'commit-msg', count: 2, messageUuid: 's1' }],
  subagents: [
    {
      source: 'task',
      agentId: 'ag1',
      agentType: 'Explore',
      prompt: 'do the thing',
      description: 'd',
      firstMessageUuid: 'a1',
    },
  ],
};

const timelineInsights: TimelineInsights = {
  timeSplit: [{ label: 'Model generation', durationMs: 60_000, pct: 100 }],
  models: [
    {
      model: 'claude-opus-4-8',
      tokens: 8000,
      durationMs: 90_000,
      costUSD: 1.2,
      exchanges: 1,
      switches: 0,
    },
    {
      model: 'claude-haiku-4-5',
      tokens: 2000,
      durationMs: 20_000,
      costUSD: 0.1,
      exchanges: 1,
      switches: 1,
    },
  ],
  modelBands: [],
  modelSwitches: 1,
  overviewBuckets: [],
  busiestFiles: [],
  topCommands: [],
  skills: [],
  toolMix: [],
  errorCount: 3,
  longestExchangeIndex: 1,
  top5TokenSharePct: 82,
  totalTokens: 10_000,
  totalCostUSD: 1.3,
  totalDurationMs: 60_000,
  totalIdleMs: 0,
};

function makeExchange(overrides: Partial<Exchange> & { index: number }): Exchange {
  return {
    startTime: '2026-08-03T09:12:00Z',
    endTime: '2026-08-03T09:13:00Z',
    durationMs: 30_000,
    idleBeforeMs: 0,
    promptPreview: `Prompt ${overrides.index}`,
    model: 'claude-opus-4-8',
    tokens: 1000,
    costUSD: 0.5,
    tools: [],
    files: [],
    commands: [],
    skills: [],
    flags: { hasErrors: false, deepThinking: false, hasSubagents: false, approvalGate: false },
    messageUuids: [],
    ...overrides,
  };
}

const timeline: TimelineResponse = {
  exchanges: [
    makeExchange({ index: 0, promptPreview: 'Edit config', model: 'claude-opus-4-8' }),
    makeExchange({ index: 1, promptPreview: 'Fix bug', model: 'claude-haiku-4-5' }),
  ],
  insights: timelineInsights,
};

const noopController = { setQuery: vi.fn() } as unknown as TimelineController;
const emptyToolResults = new Map<string, ContentBlock>();

function sidebar() {
  return within(screen.getByRole('complementary'));
}

beforeEach(() => localStorage.clear());

describe('SessionInsightsSidebar', () => {
  it('renders every section as a collapsible heading', () => {
    render(
      <MemoryRouter>
        <SessionInsightsSidebar
          insights={sessionInsights}
          timeline={timeline}
          actions={buildConversationActions({
            navigateToMessage: vi.fn(),
            timeline,
            insights: sessionInsights,
            setTab: vi.fn(),
            controller: noopController,
          })}
          toolResults={emptyToolResults}
          filePath="/home/user/session.jsonl"
          project="/home/user/proj"
          model="claude-opus-4-8"
          timestamp="2026-08-03T09:12:00Z"
          sessionId="sess-1"
          isSubagentView={false}
        />
      </MemoryRouter>,
    );

    for (const title of [
      'Overview',
      'Models',
      'Files',
      'Tools',
      'Commands',
      'Skills',
      'Errors',
      'Subagents',
      'Worktrees',
      'Raw Session File',
      'Metadata',
    ]) {
      expect(sidebar().getByText(title)).toBeInTheDocument();
    }

    // Overview is expanded by default: its tiles are visible.
    expect(sidebar().getByText('errors')).toBeInTheDocument();
    expect(sidebar().getByText('82%')).toBeInTheDocument();
  });

  it('narrows the shared track when a model row is clicked (timeline actions)', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [selected, setSelected] = useState<number | null>(null);
      const controller = useTimeline({
        timeline,
        selectedIndex: selected,
        onSelectIndex: setSelected,
      });
      return (
        <MemoryRouter>
          <TimelineSearch
            query={controller.query}
            onQueryChange={controller.setQuery}
            matchLabel={controller.matchLabel}
            onPrev={() => controller.step(-1)}
            onNext={() => controller.step(1)}
            onClear={controller.clearSearch}
          />
          <TimelineTab timeline={timeline} controller={controller} />
          <SessionInsightsSidebar
            insights={sessionInsights}
            timeline={timeline}
            actions={buildTimelineActions(controller)}
            toolResults={emptyToolResults}
            project="/p"
            model="claude-opus-4-8"
            timestamp="2026-08-03T09:12:00Z"
            sessionId="sess-1"
            isSubagentView={false}
          />
        </MemoryRouter>
      );
    }

    render(<Harness />);

    const track = () => within(screen.getByTestId('timeline-track')).queryAllByRole('button');
    expect(track()).toHaveLength(2);

    // Models is collapsed by default — expand it, then click the haiku card.
    await user.click(sidebar().getByText('Models'));
    await user.click(sidebar().getByText('Haiku 4.5'));

    expect(track()).toHaveLength(1);
    expect(screen.getByText('Fix bug')).toBeInTheDocument();
    expect(screen.queryByText('Edit config')).toBeNull();
    expect(screen.getByLabelText('Search session')).toHaveValue('claude-haiku-4-5');
  });

  it('navigates the conversation from tiles and falls back to the timeline for model rows', async () => {
    const user = userEvent.setup();
    const navigateToMessage = vi.fn();
    const setTab = vi.fn();
    const setQuery = vi.fn();
    const controller = { setQuery } as unknown as TimelineController;

    render(
      <MemoryRouter>
        <SessionInsightsSidebar
          insights={sessionInsights}
          timeline={timeline}
          actions={buildConversationActions({
            navigateToMessage,
            timeline,
            insights: sessionInsights,
            setTab,
            controller,
          })}
          toolResults={emptyToolResults}
          project="/p"
          model="claude-opus-4-8"
          timestamp="2026-08-03T09:12:00Z"
          sessionId="sess-1"
          isSubagentView={false}
        />
      </MemoryRouter>,
    );

    // Errors tile → navigate to the first error's message.
    await user.click(sidebar().getByText('errors'));
    expect(navigateToMessage).toHaveBeenCalledWith('err-1');

    // Model card (no message) → switch to Timeline and filter by the full id.
    await user.click(sidebar().getByText('Models'));
    await user.click(sidebar().getByText('Haiku 4.5'));
    expect(setTab).toHaveBeenCalledWith('timeline');
    expect(setQuery).toHaveBeenCalledWith('claude-haiku-4-5');
  });

  it('hides timeline and session-scoped sections in the subagent view', () => {
    render(
      <MemoryRouter>
        <SessionInsightsSidebar
          insights={sessionInsights}
          timeline={null}
          actions={buildConversationActions({
            navigateToMessage: vi.fn(),
            timeline: null,
            insights: sessionInsights,
            setTab: vi.fn(),
            controller: noopController,
          })}
          toolResults={emptyToolResults}
          project="/p"
          model="claude-opus-4-8"
          timestamp="2026-08-03T09:12:00Z"
          sessionId="sess-1"
          isSubagentView
        />
      </MemoryRouter>,
    );

    for (const hidden of [
      'Overview',
      'Models',
      'Skills',
      'Worktrees',
      'Metadata',
      'Raw Session File',
    ]) {
      expect(sidebar().queryByText(hidden)).toBeNull();
    }
    for (const shown of ['Files', 'Tools', 'Commands', 'Errors', 'Subagents']) {
      expect(sidebar().getByText(shown)).toBeInTheDocument();
    }
  });
});

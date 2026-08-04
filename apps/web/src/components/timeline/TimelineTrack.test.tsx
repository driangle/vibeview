import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { TimelineResponse } from '../../types';
import { TimelineTrack } from './TimelineTrack';

const emptyInsights: TimelineResponse['insights'] = {
  timeSplit: [],
  models: [],
  modelBands: [],
  modelSwitches: 0,
  overviewBuckets: [],
  busiestFiles: [],
  topCommands: [],
  skills: [],
  toolMix: [],
  errorCount: 0,
  longestExchangeIndex: -1,
  top5TokenSharePct: 0,
  totalTokens: 0,
  totalCostUSD: 0,
  totalDurationMs: 0,
  totalIdleMs: 0,
};

function makeTimeline(exchangeCount: number): TimelineResponse {
  return {
    exchanges: Array.from({ length: exchangeCount }, (_, index) => ({
      index,
      startTime: '',
      endTime: '',
      durationMs: 0,
      idleBeforeMs: 0,
      promptPreview: '',
      model: '',
      tokens: 0,
      costUSD: 0,
      tools: [],
      files: [],
      commands: [],
      skills: [],
      flags: { hasErrors: false, deepThinking: false, hasSubagents: false, approvalGate: false },
      messageUuids: [],
    })),
    insights: emptyInsights,
  };
}

describe('TimelineTrack', () => {
  it('renders an empty state when there is no timeline', () => {
    render(<TimelineTrack timeline={null} />);
    expect(screen.getByText('No timeline data for this session.')).toBeInTheDocument();
  });

  it('renders an empty state when there are no exchanges', () => {
    render(<TimelineTrack timeline={makeTimeline(0)} />);
    expect(screen.getByText('No timeline data for this session.')).toBeInTheDocument();
  });

  it('surfaces the exchange count from the timeline payload', () => {
    render(<TimelineTrack timeline={makeTimeline(3)} />);
    expect(screen.getByText('3 exchanges')).toBeInTheDocument();
  });

  it('singularizes a single exchange', () => {
    render(<TimelineTrack timeline={makeTimeline(1)} />);
    expect(screen.getByText('1 exchange')).toBeInTheDocument();
  });
});

/** Boolean badges shown for a timeline exchange. Mirrors Go timeline.ExchangeFlags. */
export interface ExchangeFlags {
  hasErrors: boolean;
  deepThinking: boolean;
  hasSubagents: boolean;
  approvalGate: boolean;
}

/**
 * One user prompt and the assistant work that answers it, with the per-row and
 * detail-panel metrics the Timeline Track renders. Mirrors Go timeline.Exchange.
 */
export interface Exchange {
  index: number;
  startTime: string; // ISO 8601, "" if none
  endTime: string; // ISO 8601, "" if none
  durationMs: number;
  idleBeforeMs: number;
  promptPreview: string;
  model: string;
  tokens: number;
  costUSD: number;
  tools: string[];
  files: string[];
  commands: string[];
  skills: string[];
  flags: ExchangeFlags;
  messageUuids: string[];
}

/** One slice of the "where the time went" breakdown. Mirrors Go timeline.TimeSplitSegment. */
export interface TimeSplitSegment {
  label: string;
  durationMs: number;
  pct: number;
}

/** One row of the per-model breakdown. Mirrors Go timeline.ModelUsage. */
export interface ModelUsage {
  model: string;
  tokens: number;
  durationMs: number;
  costUSD: number;
  exchanges: number;
  switches: number;
}

/** One contiguous run of a single model on the overview strip. Mirrors Go timeline.ModelBand. */
export interface ModelBand {
  model: string;
  leftPct: number;
  widthPct: number;
  exchanges: number;
  firstIndex: number;
}

/** One column of the token sparkline. Mirrors Go timeline.OverviewBucket. */
export interface OverviewBucket {
  tokens: number;
  errorLevel: number; // 0 none, 1 one error, 2 two or more
}

/** A name/count pair for the busiest-files, top-commands, skills, and tool-mix lists. */
export interface Tally {
  name: string;
  count: number;
}

/** Session-level timeline aggregation. Mirrors Go timeline.TimelineInsights. */
export interface TimelineInsights {
  timeSplit: TimeSplitSegment[];
  models: ModelUsage[];
  modelBands: ModelBand[];
  modelSwitches: number;
  overviewBuckets: OverviewBucket[];
  busiestFiles: Tally[];
  topCommands: Tally[];
  skills: Tally[];
  toolMix: Tally[];
  errorCount: number;
  longestExchangeIndex: number; // -1 when there are no exchanges
  top5TokenSharePct: number;
  totalTokens: number;
  totalCostUSD: number;
  totalDurationMs: number;
  totalIdleMs: number;
  /** Full session span (active + idle); the single duration the header and overview render. */
  totalSpanMs: number;
}

/** The Timeline Track payload for a single session. Mirrors Go timeline.TimelineResponse. */
export interface TimelineResponse {
  exchanges: Exchange[];
  insights: TimelineInsights;
}

import type { Exchange } from '../../types';
import { formatDurationMs, formatTokenCount } from '../../utils';
import { COLUMN_CLASS, ROW_LAYOUT } from './columns';
import { FLAG_META } from './flags';
import { LONG_EXCHANGE_MS, barPct, formatTimeOfDay } from './format';

export type Density = 'compact' | 'comfortable';

interface TrackRowProps {
  exchange: Exchange;
  selected: boolean;
  onSelect: () => void;
  /** Largest duration across the visible rows, for scaling the elapsed bar. */
  maxDurationMs: number;
  /** Largest token count across the visible rows, for scaling the token bar. */
  maxTokens: number;
  density: Density;
}

const CHIP = 'font-mono text-[10px] rounded-[3px] px-[5px] py-px';

/** Second line of the Prompt column: skill chips, the first command, and a `+N more`. */
function PromptSubline({ skills, commands }: { skills: string[]; commands: string[] }) {
  const moreCommands = commands.length - 1;
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {skills.map((skill) => (
        <span
          key={skill}
          className="flex flex-none items-center gap-[3px] rounded-[3px] border border-tertiary-container-fg/20 bg-tertiary-container px-[5px] font-mono text-[10px] text-tertiary-container-fg"
        >
          <span className="material-symbols-outlined text-[11px]">magic_button</span>/{skill}
        </span>
      ))}
      {commands[0] && (
        <span className="min-w-0 truncate font-mono text-[10px] text-muted-fg">{commands[0]}</span>
      )}
      {moreCommands > 0 && (
        <span className="flex-none font-mono text-[10px] text-muted-fg/70">
          +{moreCommands} more
        </span>
      )}
    </div>
  );
}

/**
 * One exchange as a clickable row: clock, elapsed bar, prompt (+ optional skill/
 * command subline), tool chips, files, token bar, and flag dots. Renders only
 * server-provided values; bar widths and the amber "long" colour are visual
 * scaling of those values.
 */
export function TrackRow({
  exchange,
  selected,
  onSelect,
  maxDurationMs,
  maxTokens,
  density,
}: TrackRowProps) {
  const { startTime, durationMs, promptPreview, skills, commands, tools, files, tokens, flags } =
    exchange;

  const clock = formatTimeOfDay(startTime);
  const isLong = durationMs >= LONG_EXCHANGE_MS;
  const moreFiles = files.length - 1;
  const hasSubline = skills.length > 0 || commands.length > 0;
  const activeFlags = FLAG_META.filter(({ key }) => flags[key]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      style={selected ? { boxShadow: 'inset 3px 0 0 var(--primary)' } : undefined}
      className={`${ROW_LAYOUT} w-full border-b border-border/60 text-left hover:bg-primary/5 ${
        density === 'compact' ? 'py-1' : 'py-2'
      } ${selected ? 'bg-primary/10' : ''}`}
    >
      {/* Time */}
      <span className={`${COLUMN_CLASS.time} font-mono text-[10px] text-muted-fg`}>
        {clock || '—'}
      </span>

      {/* Elapsed */}
      <div className={`${COLUMN_CLASS.elapsed} flex items-center gap-1.5`}>
        <div className="flex min-w-0 flex-1">
          <div
            className={`h-1.5 rounded-full ${isLong ? 'bg-warning' : 'bg-primary'}`}
            style={{ width: `${barPct(durationMs, maxDurationMs)}%` }}
          />
        </div>
        <span className="w-[46px] flex-none text-right font-mono text-[10px] whitespace-nowrap text-muted-fg">
          {formatDurationMs(durationMs)}
        </span>
      </div>

      {/* Prompt */}
      <div className={`${COLUMN_CLASS.prompt} flex flex-col gap-0.5`}>
        <span className="truncate font-mono text-[11.5px]">
          {promptPreview || <span className="text-muted-fg">(no prompt)</span>}
        </span>
        {hasSubline && <PromptSubline skills={skills} commands={commands} />}
      </div>

      {/* Tools */}
      <div className={`${COLUMN_CLASS.tools} flex items-center gap-1 overflow-hidden`}>
        {tools.map((tool) => (
          <span key={tool} className={`${CHIP} flex-none bg-secondary text-secondary-fg`}>
            {tool}
          </span>
        ))}
      </div>

      {/* Files */}
      <div className={`${COLUMN_CLASS.files} flex items-center gap-1.5 overflow-hidden`}>
        {files[0] && (
          <span className="min-w-0 flex-[0_1_auto] truncate font-mono text-[10px] text-muted-fg">
            {files[0]}
          </span>
        )}
        {moreFiles > 0 && (
          <span className="flex-none font-mono text-[10px] text-muted-fg">+{moreFiles}</span>
        )}
      </div>

      {/* Tokens */}
      <div className={`${COLUMN_CLASS.tokens} flex items-center justify-end gap-1.5`}>
        <div
          className="h-1 rounded-full bg-primary/35"
          style={{ width: `${barPct(tokens, maxTokens)}%` }}
        />
        <span className="w-9 flex-none text-right font-mono text-[10px] text-muted-fg">
          {formatTokenCount(tokens)}
        </span>
      </div>

      {/* Flags */}
      <div className={`${COLUMN_CLASS.flags} flex justify-end gap-[3px]`}>
        {activeFlags.map(({ key, label, color }) => (
          <span
            key={key}
            title={label}
            className="h-[7px] w-[7px] rounded-full"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </button>
  );
}

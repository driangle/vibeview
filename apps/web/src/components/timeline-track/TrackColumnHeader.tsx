import { COLUMN_CLASS, ROW_LAYOUT } from './columns';

/**
 * Sticky column header for the Timeline Track. Labels and widths match the
 * exchange rows below via the shared {@link COLUMN_CLASS} map.
 */
export function TrackColumnHeader() {
  return (
    <div
      className={`${ROW_LAYOUT} flex-none border-b border-border py-2.5 text-[10px] uppercase tracking-[0.09em] text-muted-fg`}
    >
      <span className={COLUMN_CLASS.time}>Time</span>
      <span className={COLUMN_CLASS.elapsed}>Elapsed</span>
      <span className={COLUMN_CLASS.prompt}>Prompt</span>
      <span className={COLUMN_CLASS.tools}>Tools</span>
      <span className={COLUMN_CLASS.files}>Files</span>
      <span className={`${COLUMN_CLASS.tokens} text-right`}>Tokens</span>
      <span className={`${COLUMN_CLASS.flags} text-right`}>Flags</span>
    </div>
  );
}

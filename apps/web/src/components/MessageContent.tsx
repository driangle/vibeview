import { useState, useCallback } from 'react';
import Markdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import type { Options as RehypeSanitizeOptions } from 'rehype-sanitize';
import { CodeBlock } from './CodeBlock';
import { RawJsonModal } from './RawJsonModal';
import type { MessageSegment } from './processMessageContent';
import type { MessageResponse } from '../types';

const sanitizeSchema: RehypeSanitizeOptions = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter(
    (tag) => !['iframe', 'svg', 'path', 'rect', 'circle', 'line', 'video', 'audio'].includes(tag),
  ),
  attributes: Object.fromEntries(
    Object.entries(defaultSchema.attributes ?? {}).map(([tag, attrs]) => [
      tag,
      (attrs ?? []).filter((attr) => {
        const name = typeof attr === 'string' ? attr : attr[0];
        return !/^on/i.test(String(name));
      }),
    ]),
  ),
};

function TextSegment({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const code = String(children).replace(/\n$/, '');
            if (match) {
              return <CodeBlock language={match[1]}>{code}</CodeBlock>;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

function CaveatSegment({ content, onClick }: { content: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="my-2 flex w-full items-start gap-2 rounded-md border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 text-left text-xs text-amber-800 dark:text-amber-300 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      <span>{content}</span>
    </button>
  );
}

function CommandSegment({
  name,
  args,
  onClick,
}: {
  name: string;
  args: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="my-2 flex w-full items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-left font-mono text-xs text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500"
      >
        <path
          fillRule="evenodd"
          d="M3.25 7a.75.75 0 01.75-.75h12a.75.75 0 010 1.5H4a.75.75 0 01-.75-.75zm0 6a.75.75 0 01.75-.75h12a.75.75 0 010 1.5H4a.75.75 0 01-.75-.75z"
          clipRule="evenodd"
        />
      </svg>
      <span className="font-semibold text-gray-800 dark:text-gray-200">{name}</span>
      {args && <span className="text-gray-500 dark:text-gray-400">{args}</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Segment renderer registry — add new segment types here
// ---------------------------------------------------------------------------

type SegmentRenderer = (
  segment: MessageSegment,
  key: number,
  onShowRaw: () => void,
) => React.ReactNode;

const SEGMENT_RENDERERS: Record<string, SegmentRenderer> = {
  text: (seg, key) => <TextSegment key={key} content={(seg as { content: string }).content} />,
  caveat: (seg, key, onShowRaw) => (
    <CaveatSegment key={key} content={(seg as { content: string }).content} onClick={onShowRaw} />
  ),
  command: (seg, key, onShowRaw) => {
    const s = seg as { name: string; args: string };
    return <CommandSegment key={key} name={s.name} args={s.args} onClick={onShowRaw} />;
  },
};

interface MessageContentProps {
  segments: MessageSegment[];
  rawMessage?: MessageResponse;
}

export function MessageContent({ segments, rawMessage }: MessageContentProps) {
  const [showModal, setShowModal] = useState(false);
  const openModal = useCallback(() => setShowModal(true), []);

  return (
    <>
      {segments.map((seg, i) => {
        const render = SEGMENT_RENDERERS[seg.type];
        return render ? render(seg, i, openModal) : null;
      })}
      {showModal && rawMessage && (
        <RawJsonModal data={rawMessage.message} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

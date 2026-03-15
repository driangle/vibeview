import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";
import type { MessageSegment } from "./processMessageContent";

function TextSegment({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");
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

function CaveatSegment({ content }: { content: string }) {
  return (
    <div className="my-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
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
    </div>
  );
}

function CommandSegment({ name, args }: { name: string; args: string }) {
  return (
    <div className="my-2 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 font-mono text-xs text-gray-600">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-3.5 w-3.5 shrink-0 text-gray-400"
      >
        <path
          fillRule="evenodd"
          d="M3.25 7a.75.75 0 01.75-.75h12a.75.75 0 010 1.5H4a.75.75 0 01-.75-.75zm0 6a.75.75 0 01.75-.75h12a.75.75 0 010 1.5H4a.75.75 0 01-.75-.75z"
          clipRule="evenodd"
        />
      </svg>
      <span className="font-semibold text-gray-800">{name}</span>
      {args && <span className="text-gray-500">{args}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segment renderer registry — add new segment types here
// ---------------------------------------------------------------------------

const SEGMENT_RENDERERS: Record<
  string,
  (segment: MessageSegment, key: number) => React.ReactNode
> = {
  text: (seg, key) => <TextSegment key={key} content={(seg as { content: string }).content} />,
  caveat: (seg, key) => <CaveatSegment key={key} content={(seg as { content: string }).content} />,
  command: (seg, key) => {
    const s = seg as { name: string; args: string };
    return <CommandSegment key={key} name={s.name} args={s.args} />;
  },
};

export function MessageContent({ segments }: { segments: MessageSegment[] }) {
  return (
    <>
      {segments.map((seg, i) => {
        const render = SEGMENT_RENDERERS[seg.type];
        return render ? render(seg, i) : null;
      })}
    </>
  );
}

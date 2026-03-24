import { useState } from 'react';

interface ThinkingBlockProps {
  thinking?: string;
  isActive?: boolean;
}

export function ThinkingBlock({ thinking, isActive }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  if (!thinking) {
    return (
      <div className="flex gap-4">
        <div className="w-8 h-8 rounded-full bg-tertiary-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-tertiary-container-fg text-sm">
            psychology
          </span>
        </div>
        <div className="flex-1 bg-tertiary-container/30 border border-tertiary-container p-4 rounded-lg">
          <span className="font-headline text-[10px] uppercase text-tertiary-container-fg mb-2 block font-bold">
            System Reasoning
          </span>
          {isActive ? (
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-tertiary [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-tertiary [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-tertiary" />
            </div>
          ) : (
            <p className="text-muted-fg text-sm italic">Thought completed</p>
          )}
        </div>
      </div>
    );
  }

  const preview = thinking.slice(0, 200).replace(/\n/g, ' ');

  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-tertiary-container flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-tertiary-container-fg text-sm">
          psychology
        </span>
      </div>
      <div className="flex-1 bg-tertiary-container/30 border border-tertiary-container rounded-lg overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 text-left hover:bg-tertiary-container/20 transition-colors"
        >
          <span className="font-headline text-[10px] uppercase text-tertiary-container-fg mb-2 block font-bold">
            System Reasoning
          </span>
          {!expanded && <p className="text-muted-fg text-sm italic line-clamp-3">{preview}...</p>}
        </button>
        {expanded && (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-tertiary-container px-4 py-3 text-xs text-muted-fg">
            {thinking}
          </pre>
        )}
      </div>
    </div>
  );
}

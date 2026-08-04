export type SessionTab = 'conversation' | 'timeline';

interface SessionTabsProps {
  value: SessionTab;
  onChange: (tab: SessionTab) => void;
}

const TABS: { id: SessionTab; label: string }[] = [
  { id: 'conversation', label: 'Conversation' },
  { id: 'timeline', label: 'Timeline' },
];

/**
 * Minimal underline tab bar switching the session view between the conversation
 * flow and the Timeline Track. Controlled: the parent owns the active tab.
 */
export function SessionTabs({ value, onChange }: SessionTabsProps) {
  return (
    <div role="tablist" className="flex items-center gap-1 border-b border-border px-4">
      {TABS.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors ${
              active
                ? 'border-fg font-semibold text-fg'
                : 'border-transparent font-medium text-muted-fg hover:text-fg'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

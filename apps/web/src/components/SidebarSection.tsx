import { useState } from 'react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-fg hover:text-fg transition-all shrink-0"
      title="Copy path"
    >
      <span className="material-symbols-outlined text-[10px]">
        {copied ? 'check' : 'content_copy'}
      </span>
    </button>
  );
}

export function LocateButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-fg hover:text-primary transition-all shrink-0"
      title="Locate in conversation"
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 14, fontVariationSettings: "'opsz' 14" }}
      >
        my_location
      </span>
    </button>
  );
}

function useCollapsed(key: string, defaultValue = true): [boolean, () => void] {
  // Namespaced for the unified Session Insights sidebar so it starts from the
  // section defaults (only Overview expanded) rather than inheriting collapse
  // prefs left over from the previous per-tab sidebars. Persisted from there on.
  const storageKey = `insights-collapsed:${key}`;
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === 'true' : defaultValue;
  });
  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem(storageKey, String(!prev));
      return !prev;
    });
  };
  return [collapsed, toggle];
}

export function SidebarSection({
  id,
  icon,
  title,
  count,
  meta,
  defaultCollapsed = true,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  count?: number;
  /** A right-aligned qualifier (e.g. "2 model switches") shown before the chevron. */
  meta?: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, toggle] = useCollapsed(id, defaultCollapsed);

  return (
    <div>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 font-headline text-[11px] font-bold uppercase tracking-widest text-muted-fg mb-2 hover:text-fg transition-colors"
      >
        <span className="material-symbols-outlined text-sm">{icon}</span>
        {title}
        {count != null && (
          <span className="text-[10px] font-medium text-muted-fg bg-muted px-1.5 py-0.5 rounded">
            {count}
          </span>
        )}
        {/* Summary hint appears only when collapsed, so collapsing never hides the headline number. */}
        {collapsed && meta && (
          <span className="ml-auto font-mono text-[10px] normal-case text-muted-fg">{meta}</span>
        )}
        <span
          className={`material-symbols-outlined text-xs transition-transform duration-150 ${collapsed && meta ? '' : 'ml-auto'}`}
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        >
          expand_more
        </span>
      </button>
      {!collapsed && <div className="mt-2">{children}</div>}
    </div>
  );
}

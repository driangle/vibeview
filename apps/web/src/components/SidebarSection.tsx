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
  const storageKey = `sidebar-collapsed:${key}`;
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
  defaultCollapsed = true,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  count?: number;
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
        <span
          className="material-symbols-outlined text-xs ml-auto transition-transform duration-150"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        >
          expand_more
        </span>
      </button>
      {!collapsed && <div className="mt-2">{children}</div>}
    </div>
  );
}

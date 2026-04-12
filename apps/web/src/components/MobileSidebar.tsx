import type { ComponentProps } from 'react';
import { SessionSidebar } from './SessionSidebar';

interface MobileSidebarProps {
  open: boolean;
  onToggle: () => void;
  sidebarProps: ComponentProps<typeof SessionSidebar>;
}

export function MobileSidebar({ open, onToggle, sidebarProps }: MobileSidebarProps) {
  return (
    <div
      className={`lg:hidden fixed inset-x-0 bottom-0 z-30 flex flex-col transition-transform duration-300 ease-in-out print:hidden ${
        open ? 'translate-y-0' : 'translate-y-[calc(100%-40px)]'
      }`}
      style={{ maxHeight: '80dvh' }}
    >
      <button
        onClick={onToggle}
        className={`mx-auto flex items-center gap-1.5 rounded-t-lg border-t border-x border-border shadow-sm px-5 py-2 text-xs font-medium transition-colors ${
          open ? 'bg-surface-dim text-fg' : 'bg-surface-dim/70 backdrop-blur-sm text-muted-fg'
        }`}
      >
        <span
          className={`material-symbols-outlined text-sm transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        >
          expand_less
        </span>
        Details
      </button>
      <div className="flex-1 overflow-y-auto">
        <SessionSidebar {...sidebarProps} />
      </div>
    </div>
  );
}

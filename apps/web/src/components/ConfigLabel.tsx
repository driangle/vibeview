import { useEffect, useRef, useState } from 'react';
import type { AppConfig } from '../types';
import { Modal } from './Modal';

export function ConfigLabel({ config }: { config: AppConfig }) {
  const [showModal, setShowModal] = useState(false);
  const popoverRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!showModal) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowModal(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showModal]);

  if (!config.standalone) {
    const dirs = config.dirs ?? [];
    return (
      <span className="flex items-center gap-2">
        {dirs.length > 0 && (
          <span className="relative" ref={popoverRef}>
            <button
              onClick={() => {
                if (dirs.length > 1) setShowModal((v) => !v);
              }}
              className={`rounded bg-warning/15 px-2 py-0.5 font-mono text-xs text-warning ${
                dirs.length > 1 ? 'hover:bg-warning/25 transition-colors' : 'cursor-default'
              }`}
            >
              {dirs.length === 1 ? dirs[0] : `${dirs.length} dirs`}
            </button>
            {showModal && dirs.length > 1 && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-48 rounded-lg border border-border bg-card p-2 shadow-lg">
                <ul className="space-y-1">
                  {dirs.map((d) => (
                    <li
                      key={d}
                      className="rounded bg-secondary px-2.5 py-1.5 font-mono text-xs text-secondary-fg"
                    >
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </span>
        )}
        <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-fg">
          {config.claudeDir}
        </span>
      </span>
    );
  }

  const paths = config.paths ?? [];
  const label = paths.length === 1 ? paths[0] : 'Custom';

  return (
    <>
      <button
        onClick={() => {
          if (paths.length > 1) setShowModal(true);
        }}
        className={`rounded bg-warning/15 px-2 py-0.5 font-mono text-xs text-warning ${
          paths.length > 1 ? 'hover:bg-warning/25 transition-colors' : 'cursor-default'
        }`}
      >
        {label}
      </button>

      {showModal && (
        <Modal
          onClose={() => setShowModal(false)}
          className="w-full max-w-lg overflow-auto bg-card p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">Source Paths ({paths.length})</h2>
            <button onClick={() => setShowModal(false)} className="text-muted-fg hover:text-fg">
              &times;
            </button>
          </div>
          <ul className="space-y-1">
            {paths.map((p) => (
              <li
                key={p}
                className="rounded bg-secondary px-3 py-2 font-mono text-xs text-secondary-fg"
              >
                {p}
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </>
  );
}

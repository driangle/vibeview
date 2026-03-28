import { useEffect, useRef, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import { fetcher } from '../api';
import { useActiveProject } from '../hooks/useActiveProject';
import { useBackendStatus } from '../hooks/useBackendStatus';
import { useProjects } from '../hooks/useProjects';
import { useTheme } from '../hooks/useTheme';
import type { AppConfig } from '../types';
import { ConnectionBadge } from './ConnectionBadge';
import { Modal } from './Modal';

function ConfigLabel({ config }: { config: AppConfig }) {
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

const nextLabel = { light: 'dark', dark: 'system', system: 'light' } as const;

function ThemeToggle() {
  const { setting, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="rounded p-1.5 text-muted-fg hover:bg-secondary hover:text-fg transition-colors"
      title={`Theme: ${setting} (click for ${nextLabel[setting]})`}
    >
      {setting === 'light' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.06 1.06l1.06 1.06z" />
        </svg>
      ) : setting === 'dark' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path
            fillRule="evenodd"
            d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path
            fillRule="evenodd"
            d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v8.5A2.25 2.25 0 0115.75 15h-3.105a3.501 3.501 0 001.1 1.677A.75.75 0 0113.26 18H6.74a.75.75 0 01-.484-1.323A3.501 3.501 0 007.355 15H4.25A2.25 2.25 0 012 12.75v-8.5zm1.5 0a.75.75 0 01.75-.75h11.5a.75.75 0 01.75.75v7.5a.75.75 0 01-.75.75H4.25a.75.75 0 01-.75-.75v-7.5z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
    isActive
      ? 'text-primary border-b-2 border-primary pb-[13px] pt-[15px]'
      : 'text-muted-fg hover:text-fg'
  }`;

function NavBarLink({
  to,
  end,
  children,
}: {
  to: string;
  end?: boolean;
  children: React.ReactNode;
}) {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const target = projectId ? `${to}?project=${encodeURIComponent(projectId)}` : to;

  return (
    <NavLink to={target} end={end} className={navLinkClass}>
      {children}
    </NavLink>
  );
}

function ProjectSelector() {
  const { projects } = useProjects();
  const { activeProjectId, setActiveProject } = useActiveProject();

  if (projects.length === 0) return null;

  return (
    <select
      value={activeProjectId}
      onChange={(e) => setActiveProject(e.target.value)}
      className="rounded border border-border bg-card px-2 py-1 text-sm text-fg"
    >
      <option value="">All projects</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

export function NavBar() {
  const { data: config } = useSWR<AppConfig>('/api/config', fetcher);
  const backendStatus = useBackendStatus();

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex h-12 max-w-7xl items-center gap-6 px-8">
        <span className="flex items-center gap-2 text-sm font-semibold text-fg font-mono">
          <img src="/favicon.svg" alt="" className="h-5 w-5" />
          vibeview
        </span>
        <NavBarLink to="/" end>
          Sessions
        </NavBarLink>
        <NavBarLink to="/directories">Directories</NavBarLink>
        <NavBarLink to="/projects">Projects</NavBarLink>
        <NavBarLink to="/activity">Activity</NavBarLink>
        <div className="ml-auto flex items-center gap-2">
          <ProjectSelector />
          <ConnectionBadge status={backendStatus} />
          {config && <ConfigLabel config={config} />}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `rounded p-1.5 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-fg hover:bg-secondary hover:text-fg'
              }`
            }
            title="Settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          </NavLink>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

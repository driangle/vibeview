import { useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import { fetcher } from '../api';
import { useBackendStatus } from '../hooks/useBackendStatus';
import type { AppConfig } from '../types';
import { ConnectionBadge } from './ConnectionBadge';
import { ConfigLabel } from './ConfigLabel';
import { ThemeToggle, ProjectSelector, SettingsLink } from './NavBarActions';

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

function HamburgerButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden rounded p-2 text-muted-fg hover:bg-secondary hover:text-fg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      aria-label={open ? 'Close menu' : 'Open menu'}
    >
      {open ? (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      )}
    </button>
  );
}

export function NavBar() {
  const { data: config } = useSWR<AppConfig>('/api/config', fetcher);
  const backendStatus = useBackendStatus();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="border-b border-border bg-card">
      {/* Desktop nav */}
      <div className="mx-auto flex h-12 max-w-7xl items-center gap-6 px-4 sm:px-8">
        <span className="flex items-center gap-2 text-sm font-semibold text-fg">
          <img src="/favicon.svg" alt="" className="h-5 w-5" />
          vibeview
        </span>
        <div className="hidden md:flex items-center gap-6">
          <NavBarLink to="/" end>
            Sessions
          </NavBarLink>
          <NavBarLink to="/directories">Directories</NavBarLink>
          <NavBarLink to="/projects">Projects</NavBarLink>
          <NavBarLink to="/activity">Activity</NavBarLink>
        </div>
        <div className="ml-auto hidden md:flex items-center gap-3">
          <ProjectSelector />
          <ConnectionBadge status={backendStatus} />
          {config && <ConfigLabel config={config} />}
          <SettingsLink />
          <ThemeToggle />
        </div>
        <div className="ml-auto md:hidden">
          <HamburgerButton open={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border px-4 pb-4 pt-2 space-y-1">
          <NavBarLink to="/" end>
            <span className="block min-h-[44px] flex items-center text-sm">Sessions</span>
          </NavBarLink>
          <NavBarLink to="/directories">
            <span className="block min-h-[44px] flex items-center text-sm">Directories</span>
          </NavBarLink>
          <NavBarLink to="/projects">
            <span className="block min-h-[44px] flex items-center text-sm">Projects</span>
          </NavBarLink>
          <NavBarLink to="/activity">
            <span className="block min-h-[44px] flex items-center text-sm">Activity</span>
          </NavBarLink>
          <div className="border-t border-border pt-3 mt-2 flex flex-wrap items-center gap-3">
            <ProjectSelector />
            <ConnectionBadge status={backendStatus} />
            {config && <ConfigLabel config={config} />}
            <SettingsLink />
            <ThemeToggle />
          </div>
        </div>
      )}
    </nav>
  );
}

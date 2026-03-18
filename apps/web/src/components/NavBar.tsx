import { useState } from "react";
import { NavLink } from "react-router-dom";
import useSWR from "swr";
import { fetcher } from "../api";
import { useTheme } from "../hooks/useTheme";
import type { AppConfig } from "../types";

function ConfigLabel({ config }: { config: AppConfig }) {
  const [showModal, setShowModal] = useState(false);

  if (!config.standalone) {
    return (
      <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-fg">
        {config.claudeDir}
      </span>
    );
  }

  const paths = config.paths ?? [];
  const label = paths.length === 1 ? paths[0] : "Custom";

  return (
    <>
      <button
        onClick={() => {
          if (paths.length > 1) setShowModal(true);
        }}
        className={`rounded bg-warning/15 px-2 py-0.5 font-mono text-xs text-warning ${
          paths.length > 1
            ? "cursor-pointer hover:bg-warning/25 transition-colors"
            : "cursor-default"
        }`}
      >
        {label}
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowModal(false)}
        >
          <div
            className="mx-4 max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fg">
                Source Paths ({paths.length})
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-fg hover:text-fg"
              >
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
          </div>
        </div>
      )}
    </>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="cursor-pointer rounded p-1.5 text-muted-fg hover:bg-secondary hover:text-fg transition-colors"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.06 1.06l1.06 1.06z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}

export function NavBar() {
  const { data: config } = useSWR<AppConfig>("/api/config", fetcher);

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex h-12 max-w-7xl items-center gap-6 px-8">
        <span className="text-sm font-semibold text-fg font-mono">
          vibeview
        </span>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `text-sm font-medium transition-colors ${
              isActive
                ? "text-primary border-b-2 border-primary pb-[13px] pt-[15px]"
                : "text-muted-fg hover:text-fg"
            }`
          }
        >
          Sessions
        </NavLink>
        <NavLink
          to="/directories"
          className={({ isActive }) =>
            `text-sm font-medium transition-colors ${
              isActive
                ? "text-primary border-b-2 border-primary pb-[13px] pt-[15px]"
                : "text-muted-fg hover:text-fg"
            }`
          }
        >
          Directories
        </NavLink>
        <div className="ml-auto flex items-center gap-2">
          {config && <ConfigLabel config={config} />}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

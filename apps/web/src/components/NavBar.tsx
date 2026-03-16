import { useState } from "react";
import { NavLink } from "react-router-dom";
import useSWR from "swr";
import { fetcher } from "../api";
import type { AppConfig } from "../types";

function ConfigLabel({ config }: { config: AppConfig }) {
  const [showModal, setShowModal] = useState(false);

  if (!config.standalone) {
    return (
      <span className="ml-auto rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
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
        className={`ml-auto rounded bg-amber-100 px-2 py-0.5 font-mono text-xs text-amber-800 ${
          paths.length > 1
            ? "cursor-pointer hover:bg-amber-200 transition-colors"
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
            className="mx-4 max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Source Paths ({paths.length})
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            <ul className="space-y-1">
              {paths.map((p) => (
                <li
                  key={p}
                  className="rounded bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700"
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

export function NavBar() {
  const { data: config } = useSWR<AppConfig>("/api/config", fetcher);

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-12 max-w-4xl items-center gap-6 px-8">
        <span className="text-sm font-semibold text-gray-900 font-mono">
          [vibeview]
        </span>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `text-sm font-medium transition-colors ${
              isActive
                ? "text-blue-600 border-b-2 border-blue-600 pb-[13px] pt-[15px]"
                : "text-gray-500 hover:text-gray-900"
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
                ? "text-blue-600 border-b-2 border-blue-600 pb-[13px] pt-[15px]"
                : "text-gray-500 hover:text-gray-900"
            }`
          }
        >
          Directories
        </NavLink>
        {config && <ConfigLabel config={config} />}
      </div>
    </nav>
  );
}

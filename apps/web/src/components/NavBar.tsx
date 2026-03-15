import { NavLink } from "react-router-dom";

export function NavBar() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-12 max-w-4xl items-center gap-6 px-8">
        <span className="text-sm font-semibold text-gray-900">VibeView</span>
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
      </div>
    </nav>
  );
}

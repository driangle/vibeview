import { Link } from "react-router-dom";

interface ModelBadgeProps {
  model: string;
  onClick?: (model: string) => void;
}

export function ModelBadge({ model, onClick }: ModelBadgeProps) {
  const className =
    "rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(model);
        }}
        className={className}
      >
        {model}
      </button>
    );
  }

  return (
    <Link
      to={`/?model=${encodeURIComponent(model)}`}
      className={className}
    >
      {model}
    </Link>
  );
}

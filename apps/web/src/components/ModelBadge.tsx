import { Link } from "react-router-dom";

interface ModelBadgeProps {
  model: string;
  onClick?: (model: string) => void;
}

export function ModelBadge({ model, onClick }: ModelBadgeProps) {
  const className =
    "rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-fg hover:text-primary cursor-pointer transition-colors";

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

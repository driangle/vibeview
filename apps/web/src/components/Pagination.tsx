interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-sm text-gray-500">
        Showing {(currentPage - 1) * pageSize + 1}–
        {Math.min(currentPage * pageSize, total)} of {total}
      </span>
      <div className="flex gap-1">
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="cursor-pointer rounded border border-gray-300 px-3 py-1 text-sm enabled:hover:bg-gray-50 disabled:cursor-default disabled:opacity-40"
        >
          Previous
        </button>
        {pageNumbers(currentPage, totalPages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-2 py-1 text-sm text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`cursor-pointer rounded border px-3 py-1 text-sm ${
                p === currentPage
                  ? "border-blue-500 bg-blue-50 font-medium text-blue-700"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="cursor-pointer rounded border border-gray-300 px-3 py-1 text-sm enabled:hover:bg-gray-50 disabled:cursor-default disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/** Generate page numbers with ellipsis gaps for large page counts. */
function pageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | null)[] = [1];
  if (current > 3) pages.push(null);
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    pages.push(p);
  }
  if (current < total - 2) pages.push(null);
  pages.push(total);
  return pages;
}

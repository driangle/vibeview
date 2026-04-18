export function HighlightedSnippet({ snippet, query }: { snippet: string; query: string }) {
  if (!query) return <span>{snippet}</span>;

  const parts: { text: string; highlight: boolean }[] = [];
  const lowerSnippet = snippet.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let cursor = 0;

  while (cursor < snippet.length) {
    const idx = lowerSnippet.indexOf(lowerQuery, cursor);
    if (idx === -1) {
      parts.push({ text: snippet.slice(cursor), highlight: false });
      break;
    }
    if (idx > cursor) {
      parts.push({ text: snippet.slice(cursor, idx), highlight: false });
    }
    parts.push({ text: snippet.slice(idx, idx + query.length), highlight: true });
    cursor = idx + query.length;
  }

  return (
    <span>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark key={i} className="bg-yellow-300 dark:bg-yellow-600/60 text-fg rounded-sm px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}

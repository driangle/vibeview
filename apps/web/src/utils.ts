export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function projectName(project: string, allProjects?: string[]): string {
  const parts = project.split('/').filter(Boolean);
  const name = parts[parts.length - 1] || project;

  if (allProjects) {
    const duplicates = allProjects.filter(
      (p) => p !== project && (p.split('/').filter(Boolean).pop() || p) === name,
    );
    if (duplicates.length > 0 && parts.length >= 2) {
      return `${parts[parts.length - 2]}/${name}`;
    }
  }

  return name;
}

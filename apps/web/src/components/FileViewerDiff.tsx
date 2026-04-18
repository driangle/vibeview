interface DiffLine {
  type: 'same' | 'added' | 'removed';
  text: string;
}

function computeDiff(oldStr: string, newStr: string): DiffLine[] {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');

  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        oldLines[i - 1] === newLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = m,
    j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ type: 'same', text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', text: newLines[j - 1] });
      j--;
    } else {
      result.push({ type: 'removed', text: oldLines[i - 1] });
      i--;
    }
  }

  return result.reverse();
}

const diffLineStyles: Record<DiffLine['type'], string> = {
  removed: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
  added: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  same: 'text-muted-fg',
};

const diffLinePrefix: Record<DiffLine['type'], string> = {
  removed: '-',
  added: '+',
  same: ' ',
};

export function EditDiffView({ oldString, newString }: { oldString: string; newString: string }) {
  const diffLines = computeDiff(oldString, newString);

  return (
    <pre className="text-xs leading-5">
      {diffLines.map((line, i) => (
        <div key={i} className={`px-4 ${diffLineStyles[line.type]}`}>
          <span className="mr-2 inline-block w-3 select-none opacity-60">
            {diffLinePrefix[line.type]}
          </span>
          {line.text}
        </div>
      ))}
    </pre>
  );
}

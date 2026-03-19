import { useState, useCallback, useRef } from 'react';

interface CopyableTextProps {
  text: string;
  className?: string;
  children?: React.ReactNode;
}

export function CopyableText({ text, className = '', children }: CopyableTextProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleCopy}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCopy();
        }
      }}
      className={`relative cursor-pointer rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
      title="Click to copy"
    >
      {copied && (
        <span className="absolute right-full mr-1.5 text-green-600 dark:text-green-400">
          Copied!
        </span>
      )}
      {children ?? text}
    </span>
  );
}

import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../hooks/useTheme';

interface CodeBlockProps {
  language: string | undefined;
  children: string;
}

export function CodeBlock({ language, children }: CodeBlockProps) {
  const { theme } = useTheme();

  return (
    <SyntaxHighlighter
      style={theme === 'dark' ? oneDark : oneLight}
      language={language}
      PreTag="div"
      customStyle={{ margin: 0, borderRadius: '0.375rem', fontSize: '0.75rem' }}
    >
      {children}
    </SyntaxHighlighter>
  );
}

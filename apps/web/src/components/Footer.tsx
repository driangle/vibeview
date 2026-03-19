import packageJson from '../../package.json';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-4 text-center text-xs text-gray-400 dark:text-gray-500 font-mono">
      vibeview ({packageJson.version})
    </footer>
  );
}

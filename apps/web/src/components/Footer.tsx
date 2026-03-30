import packageJson from '../../package.json';

export function Footer() {
  return (
    <footer className="py-2 text-center text-[10px] text-muted-fg font-mono">
      vibeview ({packageJson.version})
    </footer>
  );
}

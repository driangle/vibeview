import packageJson from "../../package.json";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400 font-mono">
      vibeview ({packageJson.version})
    </footer>
  );
}

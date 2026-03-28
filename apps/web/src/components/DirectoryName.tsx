import { projectName } from '../utils';

interface DirectoryNameProps {
  dir: string;
  disambiguate?: string[];
  className?: string;
}

export function DirectoryName({ dir, disambiguate, className = '' }: DirectoryNameProps) {
  return <span className={`font-mono ${className}`}>{projectName(dir, disambiguate)}</span>;
}

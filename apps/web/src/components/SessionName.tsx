import type { Session } from '../types';

export function SessionName({ session, className = '' }: { session: Session; className?: string }) {
  return (
    <span className={`font-mono ${className}`}>
      {session.customTitle || session.slug || session.id}
    </span>
  );
}

import { useState } from 'react';
import type { MessageResponse } from '../types';
import { RawJsonModal } from './RawJsonModal';

export function UnknownMessage({ message }: { message: MessageResponse }) {
  const [showJson, setShowJson] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowJson(true)}
        className="my-1 block w-full rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-left text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
      >
        <span className="font-medium">Unknown message type:</span>{' '}
        <span className="font-mono">{message.type}</span>
        <span className="ml-2 text-amber-500/70 dark:text-amber-400/60">
          (click to view raw JSON)
        </span>
      </button>
      {showJson && <RawJsonModal data={message} onClose={() => setShowJson(false)} />}
    </>
  );
}

import { useState } from 'react';
import type { MessageResponse } from '../types';
import { RawJsonModal } from './RawJsonModal';

export function EventMessage({
  message,
  label,
  borderColor,
  labelColor,
  detailColor,
  detailText,
  rawData,
}: {
  message: MessageResponse;
  label: string;
  borderColor: string;
  labelColor: string;
  detailColor: string;
  detailText: string;
  rawData?: unknown;
}) {
  const [showJson, setShowJson] = useState(false);
  const modalData = rawData ?? message;

  return (
    <>
      <div className="flex items-center overflow-hidden">
        <button
          onClick={() => setShowJson(true)}
          className={`border-l-2 ${borderColor} py-0.5 pl-2 pr-2 text-xs ${labelColor} hover:opacity-70 text-left max-w-full truncate`}
        >
          <span className="font-medium">{label}</span>
          {detailText && <span className={`ml-1.5 ${detailColor}`}>{detailText}</span>}
        </button>
      </div>
      {showJson && <RawJsonModal data={modalData ?? {}} onClose={() => setShowJson(false)} />}
    </>
  );
}

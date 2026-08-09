import { useState } from 'react';
import type { Exchange } from '../../types';
import { formatDurationMs } from '../../utils';
import { Modal } from '../Modal';
import { ModelBadge } from '../ModelBadge';
import { RawJsonModal } from '../RawJsonModal';
import { ExchangeSummary } from './ExchangeSummary';
import { ExchangeMessages } from './ExchangeMessages';
import { formatTimeOfDay } from './format';
import { resolveExchangeMessages, type SessionMessageContext } from './exchangeData';

interface ExchangeDetailPanelProps {
  exchange: Exchange;
  context: SessionMessageContext;
  /** Move to the previous exchange in the filtered list; undefined at the start. */
  onPrev?: () => void;
  /** Move to the next exchange in the filtered list; undefined at the end. */
  onNext?: () => void;
  onClose: () => void;
  /** Switch to the Conversation tab, jumping to this exchange (best-effort). */
  onOpenInConversation: () => void;
}

const HEADER_ICON = 'material-symbols-outlined cursor-pointer text-[18px] hover:text-fg';

/**
 * The centered detail modal for the selected exchange: a header (number, clock,
 * duration, model pill, prev/next/close), the summary block, the inline messages
 * at full conversation reading width, and a footer ("Open in conversation", "Raw
 * JSON"). It overlays the timeline rather than sharing width with the track, so
 * the messages read exactly as they do in the conversation view. Selection and
 * navigation are owned by the parent; this component renders one exchange.
 */
export function ExchangeDetailPanel({
  exchange,
  context,
  onPrev,
  onNext,
  onClose,
  onOpenInConversation,
}: ExchangeDetailPanelProps) {
  const [showRaw, setShowRaw] = useState(false);
  const clock = formatTimeOfDay(exchange.startTime);

  return (
    <Modal onClose={onClose} className="flex w-full max-w-4xl flex-col bg-card">
      <div
        className="flex flex-none items-center justify-between border-b border-border px-5 py-3"
        data-testid="exchange-detail-panel"
      >
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold">Exchange {exchange.index + 1}</span>
          <span className="font-mono text-[10px] text-muted-fg">
            {clock ? `${clock} · ` : ''}
            {formatDurationMs(exchange.durationMs)}
          </span>
          {exchange.model && <ModelBadge model={exchange.model} />}
        </div>
        <div className="flex items-center gap-2 text-muted-fg">
          <button
            type="button"
            onClick={onPrev}
            disabled={!onPrev}
            aria-label="Previous exchange"
            className={`${HEADER_ICON} disabled:cursor-default disabled:opacity-30`}
          >
            keyboard_arrow_up
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!onNext}
            aria-label="Next exchange"
            className={`${HEADER_ICON} disabled:cursor-default disabled:opacity-30`}
          >
            keyboard_arrow_down
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className={HEADER_ICON}>
            close
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ExchangeSummary exchange={exchange} />
        <ExchangeMessages exchange={exchange} context={context} />
      </div>

      <div className="flex flex-none gap-2 border-t border-border px-5 py-3">
        <button
          type="button"
          onClick={onOpenInConversation}
          className="flex-1 rounded-md bg-primary px-3 py-2 text-center text-xs font-medium text-primary-fg hover:bg-primary/90"
        >
          Open in conversation
        </button>
        <button
          type="button"
          onClick={() => setShowRaw(true)}
          className="rounded-md border border-border px-3 py-2 text-xs text-muted-fg hover:bg-muted"
        >
          Raw JSON
        </button>
      </div>

      {showRaw && (
        <RawJsonModal
          data={{
            exchange,
            messages: resolveExchangeMessages({ exchange, messages: context.messages }),
          }}
          onClose={() => setShowRaw(false)}
        />
      )}
    </Modal>
  );
}

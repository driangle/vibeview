import { useState } from 'react';
import type { Exchange } from '../../types';
import { MessageBubble } from '../MessageBubble';
import { resolveExchangeMessages, type SessionMessageContext } from './exchangeData';

interface ExchangeMessagesProps {
  exchange: Exchange;
  context: SessionMessageContext;
}

/**
 * The detail panel's messages block: the exchange's own messages, resolved from
 * its `messageUuids` and rendered with the shared {@link MessageBubble} so tool
 * calls, thinking, and diffs render exactly as they do in the conversation view.
 * Collapsible, open by default.
 */
export function ExchangeMessages({ exchange, context }: ExchangeMessagesProps) {
  const [open, setOpen] = useState(true);
  const messages = resolveExchangeMessages({ exchange, messages: context.messages });

  return (
    <div className="flex flex-col gap-3.5 bg-surface-dim/40 px-4 pt-3.5 pb-6">
      <div className="flex items-center gap-2">
        <span className="text-[10px] tracking-[0.1em] text-muted-fg uppercase">Messages</span>
        <span className="font-mono text-[10px] text-muted-fg">{messages.length}</span>
        <div className="h-px flex-1 bg-border" />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] text-primary hover:underline"
        >
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {open &&
        (messages.length === 0 ? (
          <span className="text-xs text-muted-fg">No messages resolved for this exchange.</span>
        ) : (
          <div className="flex flex-col gap-3.5">
            {messages.map((message) => (
              <MessageBubble
                key={message.uuid}
                message={message}
                toolResults={context.toolResults}
                agentGroups={context.agentGroups}
                agentGroupFirstIds={context.agentGroupFirstIds}
                onFocusAgent={context.onFocusAgent}
              />
            ))}
          </div>
        ))}
    </div>
  );
}

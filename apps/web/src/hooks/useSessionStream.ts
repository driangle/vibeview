import { useEffect, useRef, useState, useCallback } from 'react';
import type { MessageResponse } from '../types';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000];

export function useSessionStream(sessionId: string | undefined) {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const seenUUIDs = useRef(new Set<string>());

  useEffect(() => {
    if (!sessionId) return;

    let disposed = false;
    const retryCount = { current: 0 };
    let eventSource: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (disposed) return;

      setStatus('connecting');
      const es = new EventSource(`/api/sessions/${sessionId}/stream`);
      eventSource = es;

      es.onopen = () => {
        setStatus('connected');
        retryCount.current = 0;
      };

      es.addEventListener('message', (e) => {
        const msg: MessageResponse = JSON.parse(e.data);
        if (seenUUIDs.current.has(msg.uuid)) return;
        seenUUIDs.current.add(msg.uuid);
        setMessages((prev) => [...prev, msg]);
      });

      es.addEventListener('ping', () => {
        // Keep-alive; no action needed.
      });

      es.onerror = () => {
        es.close();
        setStatus('disconnected');
        const delay = RECONNECT_DELAYS[Math.min(retryCount.current, RECONNECT_DELAYS.length - 1)];
        retryCount.current++;
        retryTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      eventSource?.close();
      setStatus('disconnected');
    };
  }, [sessionId]);

  const addInitialUUIDs = useCallback((uuids: string[]) => {
    for (const uuid of uuids) {
      seenUUIDs.current.add(uuid);
    }
  }, []);

  return { streamedMessages: messages, connectionStatus: status, addInitialUUIDs };
}

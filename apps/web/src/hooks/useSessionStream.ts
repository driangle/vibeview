import { useEffect, useRef, useState, useCallback } from 'react';
import type { ActivityState, MessageResponse } from '../types';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000];

export function useSessionStream(sessionId: string | undefined) {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  // Server-pushed activity state (from idle decay / process liveness checks).
  const [serverActivityState, setServerActivityState] = useState<ActivityState | null>(null);
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
        let msg: MessageResponse;
        try {
          msg = JSON.parse(e.data);
        } catch {
          console.warn('Malformed SSE message data, skipping:', e.data);
          return;
        }
        if (seenUUIDs.current.has(msg.uuid)) return;
        seenUUIDs.current.add(msg.uuid);
        // A new message invalidates any server-pushed state — the client
        // will derive the latest state from the message itself.
        setServerActivityState(null);
        setMessages((prev) => [...prev, msg]);
      });

      es.addEventListener('activity_state', (e) => {
        let data: { state: ActivityState };
        try {
          data = JSON.parse(e.data);
        } catch {
          console.warn('Malformed SSE activity_state data, skipping:', e.data);
          return;
        }
        setServerActivityState(data.state);
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

  return {
    streamedMessages: messages,
    connectionStatus: status,
    serverActivityState,
    addInitialUUIDs,
  };
}

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStream } from './useSessionStream';

vi.mock('../api', () => ({ ensureStreamAuth: vi.fn(() => Promise.resolve()) }));

type Listener = (event: MessageEvent) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];
  readonly url: string;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  private listeners = new Map<string, Listener[]>();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const callback = listener as Listener;
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), callback]);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data: unknown = '') {
    const event = new MessageEvent(type, {
      data: typeof data === 'string' ? data : JSON.stringify(data),
    });
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

describe('useSessionStream', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('deduplicates initial and repeated message UUIDs', async () => {
    const { result } = renderHook(() => useSessionStream('session-1'));
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    const stream = MockEventSource.instances[0];

    act(() => {
      result.current.addInitialUUIDs(['already-loaded']);
      stream.emit('message', { uuid: 'already-loaded', type: 'assistant', timestamp: '1' });
      stream.emit('message', {
        uuid: 'new-message',
        type: 'assistant',
        timestamp: '2',
        activityState: 'working',
      });
      stream.emit('message', { uuid: 'new-message', type: 'assistant', timestamp: '2' });
    });

    expect(result.current.streamedMessages.map((message) => message.uuid)).toEqual([
      'new-message',
    ]);
    expect(result.current.serverActivityState).toBe('working');
  });

  it('reconnects with exponential backoff and closes failed streams', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSessionStream('session-2'));
    await act(async () => Promise.resolve());
    expect(MockEventSource.instances).toHaveLength(1);

    act(() => MockEventSource.instances[0].onerror?.());
    expect(MockEventSource.instances[0].closed).toBe(true);
    expect(result.current.connectionStatus).toBe('reconnecting');

    await act(async () => vi.advanceTimersByTimeAsync(999));
    expect(MockEventSource.instances).toHaveLength(1);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(MockEventSource.instances).toHaveLength(2);

    act(() => MockEventSource.instances[1].onerror?.());
    await act(async () => vi.advanceTimersByTimeAsync(1999));
    expect(MockEventSource.instances).toHaveLength(2);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(MockEventSource.instances).toHaveLength(3);

    act(() => MockEventSource.instances[2].onopen?.());
    expect(result.current.connectionStatus).toBe('connected');
  });

  it('cancels a scheduled reconnect when unmounted', async () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useSessionStream('session-3'));
    await act(async () => Promise.resolve());
    act(() => MockEventSource.instances[0].onerror?.());
    unmount();
    await act(async () => vi.runAllTimersAsync());
    expect(MockEventSource.instances).toHaveLength(1);
  });
});

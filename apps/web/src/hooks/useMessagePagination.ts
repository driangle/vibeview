import { useState, useEffect, useRef, useCallback } from 'react';
import type { MessageResponse } from '../types';

interface UseMessagePaginationOptions {
  messages: MessageResponse[];
  messagesPerPage: number;
  autoFollow: boolean;
  isSettingsLoaded: boolean;
  printing: boolean;
  streamedMessageCount: number;
}

export function useMessagePagination({
  messages,
  messagesPerPage,
  autoFollow,
  isSettingsLoaded,
  printing,
  streamedMessageCount,
}: UseMessagePaginationOptions) {
  const [userPage, setUserPage] = useState<number | null>(null);
  const [followMode, setFollowMode] = useState(false);

  // One-time initialization from async settings — intentional setState in effect
  const followInitialized = useRef(false);
  useEffect(() => {
    if (isSettingsLoaded && !followInitialized.current) {
      followInitialized.current = true;
      setFollowMode(autoFollow); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [isSettingsLoaded, autoFollow]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(messages.length / messagesPerPage));
  const page = followMode ? totalPages - 1 : Math.min(userPage ?? 0, totalPages - 1);

  const paginatedMessages = messages.slice(page * messagesPerPage, (page + 1) * messagesPerPage);

  const visibleMessages = printing ? messages : paginatedMessages;

  const [highlightUuid, setHighlightUuid] = useState<string | null>(null);
  const highlightTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const navigateToMessage = useCallback(
    (uuid: string) => {
      const msgIndex = messages.findIndex((m) => m.uuid === uuid);
      if (msgIndex === -1) return;
      const targetPage = Math.floor(msgIndex / messagesPerPage);
      setFollowMode(false);
      setUserPage(targetPage);

      setHighlightUuid(uuid);
      clearTimeout(highlightTimeout.current);
      highlightTimeout.current = setTimeout(() => setHighlightUuid(null), 2000);

      requestAnimationFrame(() => {
        const container = containerRef.current;
        const el = container?.querySelector(`[data-message-uuid="${uuid}"]`);
        if (container && el) {
          const elRect = el.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const offset =
            elRect.top - containerRect.top - container.clientHeight / 2 + elRect.height / 2;
          container.scrollBy({ top: offset, behavior: 'smooth' });
        }
      });
    },
    [messages, messagesPerPage],
  );

  const setPage = useCallback(
    (p: number) => {
      setUserPage(p);
      if (p < totalPages - 1) {
        setFollowMode(false);
      }
    },
    [totalPages],
  );

  const onPrevPage = useCallback(() => {
    if (page > 0) setPage(page - 1);
  }, [page, setPage]);

  const onNextPage = useCallback(() => {
    if (page < totalPages - 1) setPage(page + 1);
  }, [page, totalPages, setPage]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (atBottom && !followMode && page >= totalPages - 1) {
      setFollowMode(true);
    } else if (!atBottom && followMode) {
      setFollowMode(false);
    }
  }, [followMode, page, totalPages]);

  const scrollContainerToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = containerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior });
    }
  }, []);

  // Pending scroll-to-bottom: deferred until after the next render so
  // scrollHeight reflects the new page's content.
  const pendingScrollToEnd = useRef(false);

  useEffect(() => {
    if (pendingScrollToEnd.current) {
      pendingScrollToEnd.current = false;
      scrollContainerToBottom();
    }
  });

  useEffect(() => {
    if (followMode && streamedMessageCount > 0) {
      scrollContainerToBottom();
    }
  }, [streamedMessageCount, followMode, scrollContainerToBottom]);

  const scrollToEnd = useCallback(() => {
    pendingScrollToEnd.current = true;
  }, []);

  return {
    page,
    totalPages,
    visibleMessages,
    paginatedMessages,
    followMode,
    setFollowMode,
    setPage,
    onPrevPage,
    onNextPage,
    navigateToMessage,
    highlightUuid,
    messagesEndRef,
    containerRef,
    handleScroll,
    scrollToEnd,
  };
}

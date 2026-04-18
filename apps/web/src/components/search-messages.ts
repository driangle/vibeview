import type { MessageResponse } from '../types';
import { processMessageContent } from '../lib/parsers';

export interface SearchResult {
  messageUuid: string;
  messageIndex: number;
  role: string;
  snippet: string;
  matchStart: number;
}

function getSearchableText(message: MessageResponse): string {
  const content = message.message?.content;
  if (typeof content === 'string') {
    const segments = processMessageContent(content);
    return segments
      .filter((s) => s.type === 'text')
      .map((s) => s.content)
      .join('\n');
  }
  if (Array.isArray(content)) {
    return content
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => {
        const segments = processMessageContent(b.text!);
        return segments
          .filter((s) => s.type === 'text')
          .map((s) => s.content)
          .join('\n');
      })
      .join('\n');
  }
  return '';
}

function buildSnippet(text: string, matchIndex: number, query: string): string {
  const contextChars = 40;
  const start = Math.max(0, matchIndex - contextChars);
  const end = Math.min(text.length, matchIndex + query.length + contextChars);
  let snippet = '';
  if (start > 0) snippet += '...';
  snippet += text.slice(start, end);
  if (end < text.length) snippet += '...';
  return snippet;
}

export function searchMessages(messages: MessageResponse[], query: string): SearchResult[] {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const text = getSearchableText(msg);
    const lowerText = text.toLowerCase();

    let searchFrom = 0;
    while (searchFrom < lowerText.length) {
      const idx = lowerText.indexOf(lowerQuery, searchFrom);
      if (idx === -1) break;

      results.push({
        messageUuid: msg.uuid,
        messageIndex: i,
        role: msg.type === 'user' ? 'user' : msg.type === 'assistant' ? 'assistant' : msg.type,
        snippet: buildSnippet(text, idx, query),
        matchStart: idx,
      });
      searchFrom = idx + 1;

      // Cap results per message to avoid flooding
      if (results.length >= 200) return results;
    }
  }

  return results;
}

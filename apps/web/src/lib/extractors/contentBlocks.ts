import type { ContentBlock } from '../../types';

/** Extract text from a tool_result content field. */
export function resolveResultText(result: ContentBlock | undefined): string | null {
  if (!result) return null;
  const c = result.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    const textBlock = (c as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text' && b.text,
    );
    if (textBlock?.text) return textBlock.text;
  }
  return null;
}

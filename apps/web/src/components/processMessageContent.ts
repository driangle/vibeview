/**
 * Processes raw message text to strip internal XML tags and split content
 * into typed segments for rendering with appropriate UI affordances.
 *
 * To add a new tag type:
 *  1. Add a SegmentType and corresponding shape to MessageSegment
 *  2. Add a SegmentExtractor to SEGMENT_EXTRACTORS
 *  3. Add a renderer in MessageContent.tsx
 */

// ---------------------------------------------------------------------------
// Segment types
// ---------------------------------------------------------------------------

export type MessageSegment =
  | { type: "text"; content: string }
  | { type: "caveat"; content: string }
  | { type: "command"; name: string; args: string };

// ---------------------------------------------------------------------------
// Tags stripped entirely (tag + content removed)
// ---------------------------------------------------------------------------

const STRIP_PATTERNS: RegExp[] = [
  /<system-reminder>[\s\S]*?<\/system-reminder>/g,
  /<available-deferred-tools>[\s\S]*?<\/available-deferred-tools>/g,
  /<function_calls>[\s\S]*?<\/function_calls>/g,
  /<antml_thinking>[\s\S]*?<\/antml_thinking>/g,
];

// ---------------------------------------------------------------------------
// Segment extractors — order matters (first match wins per region)
// ---------------------------------------------------------------------------

interface SegmentExtractor {
  pattern: RegExp;
  toSegment: (match: RegExpExecArray) => MessageSegment | null;
}

const SEGMENT_EXTRACTORS: SegmentExtractor[] = [
  // Command invocation: command-message + command-name + command-args (+ optional stdout)
  {
    pattern:
      /<command-message>[\s\S]*?<\/command-message>\s*<command-name>([^<]*)<\/command-name>\s*<command-args>([^<]*)<\/command-args>(?:\s*<local-command-stdout>[\s\S]*?<\/local-command-stdout>)?/g,
    toSegment: (m) => ({
      type: "command",
      name: m[1].trim(),
      args: m[2].trim(),
    }),
  },
  // Local command caveat notice
  {
    pattern: /<local-command-caveat>([\s\S]*?)<\/local-command-caveat>/g,
    toSegment: (m) => {
      const content = m[1].trim();
      return content ? { type: "caveat", content } : null;
    },
  },
];

// ---------------------------------------------------------------------------
// Catch-all cleanup for remaining system tags in text segments
// ---------------------------------------------------------------------------

const LEFTOVER_UNWRAP =
  /<\/?(command-name|command-message|command-args|local-command-stdout|invoke|parameter|antml_invoke|antml_parameter)(?:\s[^>]*)?\/?>/g;

const HTML_TAGS =
  /^<\/?(a|b|i|u|em|strong|br|hr|p|div|span|img|table|tr|td|th|thead|tbody|ul|ol|li|h[1-6]|pre|code|blockquote|details|summary|sup|sub|del|ins|mark|small|big|s|strike|abbr|cite|dfn|kbd|q|samp|var|wbr|dl|dt|dd|figure|figcaption|picture|source|video|audio|iframe|svg|path|rect|circle|line)[\s>/]/i;

function cleanTextSegment(text: string): string {
  let out = text;
  out = out.replace(LEFTOVER_UNWRAP, "");
  out = out.replace(/<\/?\w[\w-]*(?:\s[^>]*)?\/?>/g, (tag) =>
    HTML_TAGS.test(tag) ? tag : "",
  );
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

// ---------------------------------------------------------------------------
// Code block protection
// ---------------------------------------------------------------------------

const CODE_BLOCK_PLACEHOLDER = "\0CB";

function protectCodeBlocks(text: string): { text: string; blocks: string[] } {
  const blocks: string[] = [];
  const replaced = text.replace(/(`{1,3})([\s\S]*?)\1/g, (match) => {
    blocks.push(match);
    return `${CODE_BLOCK_PLACEHOLDER}${blocks.length - 1}${CODE_BLOCK_PLACEHOLDER}`;
  });
  return { text: replaced, blocks };
}

function restoreCodeBlocks(text: string, blocks: string[]): string {
  return text.replace(
    new RegExp(`${CODE_BLOCK_PLACEHOLDER}(\\d+)${CODE_BLOCK_PLACEHOLDER}`, "g"),
    (_m, idx: string) => blocks[parseInt(idx, 10)],
  );
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function processMessageContent(raw: string): MessageSegment[] {
  const { text: protected_, blocks } = protectCodeBlocks(raw);

  // Strip system tags entirely.
  let text = protected_;
  for (const re of STRIP_PATTERNS) {
    text = text.replace(re, "");
  }

  // Collect all special segment matches with their positions.
  const found: { start: number; end: number; segment: MessageSegment }[] = [];
  for (const extractor of SEGMENT_EXTRACTORS) {
    // Reset lastIndex for global regexes.
    extractor.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = extractor.pattern.exec(text)) !== null) {
      const seg = extractor.toSegment(m);
      if (seg) {
        found.push({ start: m.index, end: m.index + m[0].length, segment: seg });
      }
    }
  }

  // Sort by position and build interleaved segments.
  found.sort((a, b) => a.start - b.start);

  const segments: MessageSegment[] = [];
  let cursor = 0;

  for (const { start, end, segment } of found) {
    if (start > cursor) {
      const raw = text.slice(cursor, start);
      const cleaned = cleanTextSegment(restoreCodeBlocks(raw, blocks));
      if (cleaned) segments.push({ type: "text", content: cleaned });
    }
    segments.push(segment);
    cursor = end;
  }

  // Trailing text.
  if (cursor < text.length) {
    const raw = text.slice(cursor);
    const cleaned = cleanTextSegment(restoreCodeBlocks(raw, blocks));
    if (cleaned) segments.push({ type: "text", content: cleaned });
  }

  return segments;
}

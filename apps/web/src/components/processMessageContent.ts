/**
 * Processes raw message text to strip or format internal XML tags
 * before markdown rendering.
 *
 * Strategy: protect code blocks with placeholders, process tags, restore blocks.
 */

/** Tags whose content should be removed entirely. */
const STRIP_WITH_CONTENT: RegExp[] = [
  /<system-reminder>[\s\S]*?<\/system-reminder>/g,
  /<available-deferred-tools>[\s\S]*?<\/available-deferred-tools>/g,
  /<function_calls>[\s\S]*?<\/function_calls>/g,
  /<antml_thinking>[\s\S]*?<\/antml_thinking>/g,
];

/** Tags to remove but whose inner text content should be kept. */
const UNWRAP_TAGS =
  /<\/?(command-name|command-message|command-args|local-command-stdout|invoke|parameter|antml_invoke|antml_parameter)(?:\s[^>]*)?\/?>/g;

/**
 * `<local-command-caveat>` content → styled blockquote notice.
 * Captures the inner text and rewrites it as a markdown blockquote.
 */
const LOCAL_CAVEAT_RE =
  /<local-command-caveat>([\s\S]*?)<\/local-command-caveat>/g;

/** Placeholder sentinel unlikely to appear in real content. */
const PLACEHOLDER = "\0CB";

export function processMessageContent(raw: string): string {
  // 1. Extract code blocks (fenced and inline) to protect them.
  const codeBlocks: string[] = [];
  let text = raw.replace(/(`{1,3})([\s\S]*?)\1/g, (match) => {
    codeBlocks.push(match);
    return `${PLACEHOLDER}${codeBlocks.length - 1}${PLACEHOLDER}`;
  });

  // 2. Strip tags + content that provide no user value.
  for (const re of STRIP_WITH_CONTENT) {
    text = text.replace(re, "");
  }

  // 3. Convert <local-command-caveat> to a styled blockquote.
  text = text.replace(LOCAL_CAVEAT_RE, (_match, inner: string) => {
    const trimmed = inner.trim();
    return `> **Note:** ${trimmed.replace(/\n/g, "\n> ")}`;
  });

  // 4. Unwrap tags that are just wrappers — keep inner text.
  text = text.replace(UNWRAP_TAGS, "");

  // 5. Catch any remaining unrecognized XML-like tags from the system.
  //    Only targets tags that look like system/internal tags (lowercase with hyphens),
  //    NOT user-authored HTML like <div>, <span>, etc.
  text = text.replace(/<\/?\w[\w-]*(?:\s[^>]*)?\/?>/g, (match) => {
    // Preserve common markdown/HTML tags that users might intentionally write
    if (/^<\/?(a|b|i|u|em|strong|br|hr|p|div|span|img|table|tr|td|th|thead|tbody|ul|ol|li|h[1-6]|pre|code|blockquote|details|summary|sup|sub|del|ins|mark|small|big|s|strike|abbr|cite|dfn|kbd|q|samp|var|wbr|dl|dt|dd|figure|figcaption|picture|source|video|audio|iframe|svg|path|rect|circle|line)[\s>\/]/i.test(match)) {
      return match;
    }
    return "";
  });

  // 6. Clean up excessive blank lines left by removals.
  text = text.replace(/\n{3,}/g, "\n\n");

  // 7. Restore code blocks.
  text = text.replace(
    new RegExp(`${PLACEHOLDER}(\\d+)${PLACEHOLDER}`, "g"),
    (_match, index: string) => codeBlocks[parseInt(index, 10)],
  );

  return text.trim();
}

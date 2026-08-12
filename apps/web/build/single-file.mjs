/**
 * Folds the build output into one HTML file.
 *
 * An exported page has to open from disk with no server and no network, so the
 * script and stylesheet are inlined and their standalone files dropped. Fonts
 * and images are already data URIs by then (assetsInlineLimit), leaving the HTML
 * as the only artifact.
 */
export function singleFile() {
  return {
    name: 'vibeview:single-file',
    enforce: 'post',

    generateBundle(_options, bundle) {
      const html = Object.values(bundle).find((file) => file.fileName.endsWith('.html'));
      if (!html) return;

      let source = html.source;

      for (const file of Object.values(bundle)) {
        if (file.fileName.endsWith('.html')) continue;

        if (file.type === 'chunk') {
          // A `</script>` inside a string literal or grammar would close the
          // tag early; the escaped form is equivalent in JS.
          const code = file.code.replace(/<\/script/gi, '<\\/script');
          source = replaceOnce(
            source,
            new RegExp(`<script[^>]*src="[^"]*${escapeRegExp(file.fileName)}"[^>]*></script>`),
            `<script type="module">${code}</script>`,
          );
          delete bundle[file.fileName];
        } else if (file.fileName.endsWith('.css')) {
          source = replaceOnce(
            source,
            new RegExp(`<link[^>]*href="[^"]*${escapeRegExp(file.fileName)}"[^>]*>`),
            `<style>${file.source}</style>`,
          );
          delete bundle[file.fileName];
        }
      }

      // Preload hints point at files that no longer exist.
      source = source.replace(/<link[^>]*rel="modulepreload"[^>]*>\s*/g, '');
      html.source = source;
    },
  };
}

/**
 * Substitutes the first match with `replacement` taken literally. A replacement
 * *string* would expand `$&`, `` $` `` and friends -- sequences that occur all
 * over minified JS, splicing chunks of the page back into itself.
 */
function replaceOnce(source, pattern, replacement) {
  return source.replace(pattern, () => replacement);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

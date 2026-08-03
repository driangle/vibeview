import { describe, expect, it } from 'vitest';
import { processMessageContent } from './processMessageContent';

describe('processMessageContent', () => {
  it('interleaves text, commands, and caveats while stripping internal content', () => {
    const raw = `Before
<system-reminder>secret</system-reminder>
<command-message>run</command-message><command-name>test</command-name><command-args>--watch</command-args>
<local-command-caveat>Runs locally</local-command-caveat>
After`;

    expect(processMessageContent(raw)).toEqual([
      { type: 'text', content: 'Before' },
      { type: 'command', name: 'test', args: '--watch' },
      { type: 'caveat', content: 'Runs locally' },
      { type: 'text', content: 'After' },
    ]);
  });

  it('protects tag-like text inside inline and fenced code', () => {
    const raw = '`<system-reminder>keep inline</system-reminder>`\n```xml\n<invoke>keep fenced</invoke>\n```';
    expect(processMessageContent(raw)).toEqual([{ type: 'text', content: raw }]);
  });

  it('removes unknown system tags and unsafe event attributes from retained HTML', () => {
    expect(processMessageContent('<internal>drop tag</internal><b onclick="bad()">keep</b>')).toEqual([
      { type: 'text', content: 'drop tag<b>keep</b>' },
    ]);
  });
});

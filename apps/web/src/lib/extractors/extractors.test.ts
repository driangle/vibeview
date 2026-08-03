import { describe, expect, it } from 'vitest';
import type { ContentBlock, MessageResponse } from '../../types';
import { extractBashCommands } from './commands/fromToolUseBlocks';
import { getContentBlocks, resolveResultText } from './contentBlocks';
import { extractErrors, hasErrorResults } from './errors/fromToolResults';
import { extractFileExtensions, extractFiles } from './files/fromToolUseBlocks';
import { fromAgentProgress } from './subagents/fromAgentProgress';
import { fromToolUse } from './subagents/fromToolUse';
import { extractToolCounts } from './tools/fromToolUseBlocks';

const message = (uuid: string, type: MessageResponse['type'], content?: ContentBlock[]): MessageResponse => ({
  uuid,
  type,
  timestamp: `time-${uuid}`,
  ...(content ? { message: { role: type, content } } : {}),
});

describe('message extractors', () => {
  it('safely resolves absent, string, and structured result content', () => {
    expect(getContentBlocks(message('empty', 'assistant'))).toEqual([]);
    expect(resolveResultText({ type: 'tool_result', content: 'plain' })).toBe('plain');
    expect(resolveResultText({ type: 'tool_result', content: [{ type: 'image' }, { type: 'text', text: 'nested' }] })).toBe('nested');
    expect(resolveResultText({ type: 'tool_result', content: [{ type: 'image' }] })).toBeNull();
  });

  it('derives commands, sorted tool counts, and categorized unique files', () => {
    const messages = [
      message('a', 'assistant', [
        { type: 'tool_use', id: '1', name: 'Bash', input: { command: 'npm test' } },
        { type: 'tool_use', id: '2', name: 'Write', input: { file_path: '/tmp/z.ts' } },
      ]),
      message('b', 'assistant', [
        { type: 'tool_use', id: '3', name: 'Read', input: { file_path: '/tmp/a.test.ts' } },
        { type: 'tool_use', id: '4', name: 'Bash', input: { command: 42 } },
      ]),
    ];

    expect(extractBashCommands(messages)).toEqual([
      { command: 'npm test', toolUseId: '1', messageUuid: 'a' },
    ]);
    expect(extractToolCounts(messages)).toEqual([
      { name: 'Bash', count: 2 },
      { name: 'Write', count: 1 },
      { name: 'Read', count: 1 },
    ]);
    expect(extractFiles(messages).categories).toEqual({ written: ['/tmp/z.ts'], read: ['/tmp/a.test.ts'] });
    expect(extractFileExtensions(messages)).toEqual(new Set(['.ts']));
  });

  it('joins error results to tool calls and detects inline user errors', () => {
    const call = message('call', 'assistant', [{ type: 'tool_use', id: 'tool-1', name: 'Bash' }]);
    const results = new Map<string, ContentBlock>([
      ['tool-1', { type: 'tool_result', is_error: true, content: 'x'.repeat(250) }],
    ]);
    expect(extractErrors([call], results)).toEqual([
      { toolName: 'Bash', snippet: 'x'.repeat(200), messageUuid: 'call' },
    ]);
    expect(hasErrorResults([message('user', 'user', [{ type: 'tool_result', is_error: true }])])).toBe(true);
    expect(hasErrorResults([message('assistant', 'assistant', [{ type: 'tool_result', is_error: true }])])).toBe(false);
  });

  it('derives both progress and tool-use subagents with stable fallbacks', () => {
    const progress = message('p1', 'progress');
    progress.data = { type: 'agent_progress', agentId: 'agent-a', prompt: 'Investigate' };
    const followup = message('p2', 'progress');
    followup.data = { type: 'agent_progress', agentId: 'agent-a' };
    expect(fromAgentProgress([progress, followup])[0]).toMatchObject({
      agentId: 'agent-a', prompt: 'Investigate', firstMessageUuid: 'p1', turns: [progress, followup],
    });

    const calls = message('agents', 'assistant', [
      { type: 'tool_use', id: 'spawn-1', name: 'Agent', input: { prompt: 'Build', description: 'worker' } },
      { type: 'tool_use', id: 'spawn-2', name: 'Agent', input: { prompt: 'Review' } },
    ]);
    const results = new Map<string, ContentBlock>([
      ['spawn-1', { type: 'tool_result', content: 'Started agentId: abc123' }],
    ]);
    expect(fromToolUse([calls], results).map(({ agentId, prompt }) => ({ agentId, prompt }))).toEqual([
      { agentId: 'abc123', prompt: 'Build' },
      { agentId: 'tool_use_spawn-2', prompt: 'Review' },
    ]);
  });
});

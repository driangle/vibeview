import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FileViewer } from './FileViewer';
import type { FileOperation } from './FileViewer';

// CodeBlock pulls in the syntax highlighter and theme context; the FileViewer
// tests only care about layout/toggle behavior, so stub it to a plain <pre>.
vi.mock('./CodeBlock', () => ({
  CodeBlock: ({ children }: { children: string }) => <pre>{children}</pre>,
}));

const readOp: FileOperation = { type: 'read', content: 'hello', timestamp: '' };

describe('FileViewer', () => {
  it('shows the empty state when there are no operations', () => {
    render(<FileViewer filePath="/tmp/a.txt" operations={[]} onClose={vi.fn()} />);
    expect(screen.getByText('Content not available in session data')).toBeInTheDocument();
  });

  it('renders the operation badge by default', () => {
    render(<FileViewer filePath="/tmp/a.txt" operations={[readOp]} onClose={vi.fn()} />);
    expect(screen.getByText('Read')).toBeInTheDocument();
  });

  it('hides the operation badge when showOperationMeta is false', () => {
    render(
      <FileViewer
        filePath="/tmp/a.txt"
        operations={[readOp]}
        showOperationMeta={false}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText('Read')).not.toBeInTheDocument();
  });

  it('never renders a Raw toggle', () => {
    const bigOp: FileOperation = { type: 'read', content: 'x'.repeat(60_000), timestamp: '' };
    render(<FileViewer filePath="/tmp/big.jsonl" operations={[bigOp]} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /raw/i })).not.toBeInTheDocument();
  });

  it('shows the Copy button only when showCopy is set', () => {
    const { rerender } = render(
      <FileViewer filePath="/tmp/a.txt" operations={[readOp]} onClose={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument();

    rerender(<FileViewer filePath="/tmp/a.txt" operations={[readOp]} showCopy onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('copies the content to the clipboard when Copy is clicked', async () => {
    const user = userEvent.setup();
    // userEvent.setup() installs a clipboard stub; spy on its writeText.
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');

    render(<FileViewer filePath="/tmp/a.txt" operations={[readOp]} showCopy onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /copy/i }));

    expect(writeText).toHaveBeenCalledWith('hello');
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });

  it('renders an image operation as an img element', () => {
    const imageOp: FileOperation = {
      type: 'image',
      content: 'data:image/png;base64,AAAA',
      timestamp: '',
    };
    render(<FileViewer filePath="/tmp/chart.png" operations={[imageOp]} onClose={vi.fn()} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,AAAA');
  });
});

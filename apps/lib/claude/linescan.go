package claude

import (
	"bufio"
	"io"
)

// DefaultMaxLineBytes is the maximum size of a single JSONL line the scanner
// will buffer and return. Lines larger than this are skipped as oversized
// (e.g. a huge tool result or an inlined base64 image) rather than aborting the
// whole scan.
const DefaultMaxLineBytes = 2 * 1024 * 1024

// lineReaderBufSize is the size of the underlying bufio.Reader buffer. Lines up
// to this size are read in a single call; larger lines are accumulated across
// reads. Sized generously so typical JSONL lines fit in one read.
const lineReaderBufSize = 64 * 1024

// LineScanner reads newline-delimited lines from an io.Reader while enforcing a
// maximum line size. Unlike bufio.Scanner, an over-limit line does not abort the
// scan: the oversized line is discarded and flagged via Oversized, and scanning
// continues with the following lines. This keeps a single giant line from
// rendering an entire session unparseable.
type LineScanner struct {
	r         *bufio.Reader
	maxBytes  int
	line      []byte
	oversized bool
	overBytes int64
	consumed  int64
	err       error
}

// NewLineScanner returns a LineScanner reading from r, treating any line larger
// than maxBytes as oversized.
func NewLineScanner(r io.Reader, maxBytes int) *LineScanner {
	return &LineScanner{
		r:        bufio.NewReaderSize(r, lineReaderBufSize),
		maxBytes: maxBytes,
	}
}

// Scan advances to the next line, returning false at end of input or on a read
// error (check Err). After a successful Scan, use Bytes for a normal line or
// Oversized to detect a skipped over-limit line.
func (s *LineScanner) Scan() bool {
	s.line = nil
	s.oversized = false
	s.overBytes = 0
	s.consumed = 0

	var buf []byte
	haveData := false
	for {
		frag, err := s.r.ReadSlice('\n')
		s.consumed += int64(len(frag))
		if len(frag) > 0 {
			haveData = true
		}
		switch err {
		case nil:
			// frag ends with the delimiter; drop it and finish the line.
			buf = s.append(buf, frag[:len(frag)-1])
			s.line = buf
			return true
		case bufio.ErrBufferFull:
			// Line longer than the read buffer; keep accumulating.
			buf = s.append(buf, frag)
			continue
		case io.EOF:
			if !haveData {
				return false // nothing left to read
			}
			// Final line without a trailing newline.
			buf = s.append(buf, frag)
			s.line = buf
			return true
		default:
			s.err = err
			return false
		}
	}
}

// append grows buf with frag while the accumulated size stays within maxBytes.
// Once the limit is crossed the line is flagged oversized and its bytes are
// discarded, so an arbitrarily large line never lives in memory.
func (s *LineScanner) append(buf, frag []byte) []byte {
	s.overBytes += int64(len(frag))
	if s.oversized {
		return nil
	}
	if len(buf)+len(frag) > s.maxBytes {
		s.oversized = true
		return nil
	}
	return append(buf, frag...)
}

// Bytes returns the current line's content, excluding the trailing newline. It
// returns nil for an oversized line (whose content was discarded). The slice is
// only valid until the next call to Scan.
func (s *LineScanner) Bytes() []byte {
	return s.line
}

// Oversized reports whether the current line exceeded the size limit and was
// therefore skipped rather than returned.
func (s *LineScanner) Oversized() bool {
	return s.oversized
}

// OversizedBytes returns the byte length of the current oversized line (0 for a
// normal line), useful for diagnostics.
func (s *LineScanner) OversizedBytes() int64 {
	if s.oversized {
		return s.overBytes
	}
	return 0
}

// Consumed returns the number of bytes read from the underlying reader for the
// current line, including its trailing newline. It lets callers that track a
// file offset advance past a line even when the line itself was skipped.
func (s *LineScanner) Consumed() int64 {
	return s.consumed
}

// Err returns the first non-EOF error encountered while scanning.
func (s *LineScanner) Err() error {
	return s.err
}

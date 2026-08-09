package timeline

import (
	"math"
	"sort"

	"github.com/driangle/vibeview/apps/lib/claude"
	"github.com/driangle/vibeview/apps/lib/insights"
)

// Aggregation tuning constants. These mirror the design mock's renderVals()
// spec so the client renders the aggregates as-is.
const (
	// overviewBucketCount is the number of columns in the overview sparkline.
	overviewBucketCount = 112

	// subagentDurationShare is the fraction of a subagent exchange's duration
	// attributed to subagent work in the time-split heuristic. Subagent time is
	// not measured directly; the mock assumes just over half a subagent
	// exchange's wall-clock is spent inside the subagent.
	subagentDurationShare = 0.55

	// toolCallMs is the assumed wall-clock per tool call used to bound the tool
	// share of an exchange's duration. Tool time is capped at
	// toolsUsed * toolCallMs so an exchange with few tools can't over-attribute
	// to tools; the remainder counts as model generation.
	toolCallMs = 11000

	// bandMinWidthPct is the floor width of a model band so a very short run
	// still renders as a visible sliver.
	bandMinWidthPct = 0.25

	// topFilesLimit / topCommandsLimit bound the "busiest files" and
	// "most-run commands" lists in the insights popover.
	topFilesLimit    = 5
	topCommandsLimit = 4

	// topTokenShareCount is how many top-token exchanges the headline
	// "tokens in top N" share is computed over.
	topTokenShareCount = 5
)

// TimelineInsights is the session-level aggregation the Timeline Track's
// overview strip and insights popover render. Every value is derived here in Go;
// the client formats and colors them but computes nothing. See BuildInsights.
type TimelineInsights struct {
	TimeSplit            []TimeSplitSegment `json:"timeSplit"`
	Models               []ModelUsage       `json:"models"`
	ModelBands           []ModelBand        `json:"modelBands"`
	ModelSwitches        int                `json:"modelSwitches"` // total switches between contiguous model runs
	OverviewBuckets      []OverviewBucket   `json:"overviewBuckets"`
	BusiestFiles         []Tally            `json:"busiestFiles"`
	TopCommands          []Tally            `json:"topCommands"`
	Skills               []Tally            `json:"skills"`
	ToolMix              []Tally            `json:"toolMix"`
	ErrorCount           int                `json:"errorCount"`           // exchanges with an error result
	LongestExchangeIndex int                `json:"longestExchangeIndex"` // -1 when there are no exchanges
	Top5TokenSharePct    int                `json:"top5TokenSharePct"`    // % of tokens in the 5 heaviest exchanges
	TotalTokens          int                `json:"totalTokens"`
	TotalCostUSD         float64            `json:"totalCostUSD"`
	TotalDurationMs      int64              `json:"totalDurationMs"` // summed active exchange durations
	TotalIdleMs          int64              `json:"totalIdleMs"`     // summed gaps between exchanges
	TotalSpanMs          int64              `json:"totalSpanMs"`     // full session span (active + idle); the single duration the header and overview render
}

// TimeSplitSegment is one slice of the "where the time went" breakdown. Pct is
// a share of the total span (active + idle); the four segments sum to ~100.
type TimeSplitSegment struct {
	Label      string  `json:"label"`
	DurationMs int64   `json:"durationMs"`
	Pct        float64 `json:"pct"`
}

// ModelUsage is one row of the per-model breakdown, sorted by tokens desc.
type ModelUsage struct {
	Model      string  `json:"model"` // model id
	Tokens     int     `json:"tokens"`
	DurationMs int64   `json:"durationMs"`
	CostUSD    float64 `json:"costUSD"`
	Exchanges  int     `json:"exchanges"`
	Switches   int     `json:"switches"` // number of contiguous runs of this model
}

// ModelBand is one contiguous run of a single model on the overview strip.
// LeftPct/WidthPct position the band across the full session span.
type ModelBand struct {
	Model      string  `json:"model"`
	LeftPct    float64 `json:"leftPct"`
	WidthPct   float64 `json:"widthPct"`
	Exchanges  int     `json:"exchanges"`
	FirstIndex int     `json:"firstIndex"` // exchange index this band jumps to
}

// OverviewBucket is one column of the token sparkline. ErrorLevel is 0 (none),
// 1 (one error), or 2 (two or more) so the client can color the column.
type OverviewBucket struct {
	Tokens     int `json:"tokens"`
	ErrorLevel int `json:"errorLevel"`
}

// Tally is a name/count pair for the busiest-files, top-commands, skills, and
// tool-mix lists.
type Tally struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// BuildInsights aggregates a session's exchanges into the timeline insights.
// Timing/model/token/error aggregates come from the exchanges; the file,
// command, skill, and tool-mix tallies reuse the shared whole-session
// extractors over messages. It is safe on empty and single-exchange sessions:
// no panics and no divide-by-zero (empty spans yield zeroed shares).
func BuildInsights(exchanges []Exchange, messages []claude.Message) TimelineInsights {
	offsets, span := timelineOffsets(exchanges)

	return TimelineInsights{
		TimeSplit:            timeSplit(exchanges),
		Models:               models(exchanges),
		ModelBands:           modelBands(exchanges, offsets, span),
		ModelSwitches:        modelSwitches(exchanges),
		OverviewBuckets:      overviewBuckets(exchanges, offsets, span),
		BusiestFiles:         busiestFiles(messages),
		TopCommands:          topCommands(messages),
		Skills:               skills(messages),
		ToolMix:              toolMix(messages),
		ErrorCount:           errorCount(exchanges),
		LongestExchangeIndex: longestExchangeIndex(exchanges),
		Top5TokenSharePct:    topTokenSharePct(exchanges),
		TotalTokens:          totalTokens(exchanges),
		TotalCostUSD:         totalCostUSD(exchanges),
		TotalDurationMs:      totalDurationMs(exchanges),
		TotalIdleMs:          totalIdleMs(exchanges),
		TotalSpanMs:          span, // == totalDurationMs + totalIdleMs by construction
	}
}

// timelineOffsets returns each exchange's start offset on a synthetic timeline
// built by accumulating idle gaps and durations, and the total span. This
// mirrors the mock's cumulative `t` and is robust to missing or out-of-order
// timestamps because it depends only on the per-exchange durations and gaps.
func timelineOffsets(exchanges []Exchange) (offsets []int64, span int64) {
	offsets = make([]int64, len(exchanges))
	var t int64
	for i, e := range exchanges {
		t += e.IdleBeforeMs
		offsets[i] = t
		t += e.DurationMs
	}
	return offsets, t
}

// timeSplit derives the "where the time went" breakdown. Attribution is a
// heuristic (there is no ground truth): a subagent exchange gives
// subagentDurationShare of its duration to subagents; tool time is bounded by
// toolsUsed * toolCallMs; whatever remains is model generation; idle is the
// summed gaps between exchanges. Segments always sum to the full span.
func timeSplit(exchanges []Exchange) []TimeSplitSegment {
	var subMs, toolMs, genMs, idleMs float64
	for _, e := range exchanges {
		dur := float64(e.DurationMs)
		agent := 0.0
		if e.Flags.HasSubagents {
			agent = dur * subagentDurationShare
		}
		tools := math.Min(dur-agent, float64(len(e.Tools))*toolCallMs)
		subMs += agent
		toolMs += tools
		genMs += dur - agent - tools
		idleMs += float64(e.IdleBeforeMs)
	}
	span := subMs + toolMs + genMs + idleMs
	return []TimeSplitSegment{
		{Label: "Model generation", DurationMs: int64(math.Round(genMs)), Pct: pct(genMs, span)},
		{Label: "Tool calls", DurationMs: int64(math.Round(toolMs)), Pct: pct(toolMs, span)},
		{Label: "Subagents", DurationMs: int64(math.Round(subMs)), Pct: pct(subMs, span)},
		{Label: "Waiting on you", DurationMs: int64(math.Round(idleMs)), Pct: pct(idleMs, span)},
	}
}

// modelAcc accumulates per-model totals across a session.
type modelAcc struct {
	tokens    int
	dur       int64
	cost      float64
	exchanges int
	switches  int
}

// models returns the per-model breakdown sorted by tokens descending (model id
// ascending as a stable tiebreak).
func models(exchanges []Exchange) []ModelUsage {
	perModel := map[string]*modelAcc{}
	var order []string
	for i, e := range exchanges {
		acc := perModel[e.Model]
		if acc == nil {
			acc = &modelAcc{}
			perModel[e.Model] = acc
			order = append(order, e.Model)
		}
		acc.tokens += e.Tokens
		acc.dur += e.DurationMs
		acc.cost += e.CostUSD
		acc.exchanges++
		if i == 0 || exchanges[i-1].Model != e.Model {
			acc.switches++
		}
	}

	rows := make([]ModelUsage, 0, len(order))
	for _, id := range order {
		acc := perModel[id]
		rows = append(rows, ModelUsage{
			Model:      id,
			Tokens:     acc.tokens,
			DurationMs: acc.dur,
			CostUSD:    acc.cost,
			Exchanges:  acc.exchanges,
			Switches:   acc.switches,
		})
	}
	sort.Slice(rows, func(i, j int) bool {
		if rows[i].Tokens != rows[j].Tokens {
			return rows[i].Tokens > rows[j].Tokens
		}
		return rows[i].Model < rows[j].Model
	})
	return rows
}

// modelRun is a contiguous run of a single model, in timeline-offset ms.
type modelRun struct {
	model      string
	start, end int64
	exchanges  int
	firstIndex int
}

// modelBands returns the contiguous runs of each model positioned across the
// full span. A run breaks whenever the model differs from the previous
// exchange. Widths are floored at bandMinWidthPct so short runs stay visible.
func modelBands(exchanges []Exchange, offsets []int64, span int64) []ModelBand {
	var runs []modelRun
	for i, e := range exchanges {
		end := offsets[i] + e.DurationMs
		if i == 0 || exchanges[i-1].Model != e.Model {
			start := offsets[i]
			if i == 0 {
				start = 0
			}
			runs = append(runs, modelRun{model: e.Model, start: start, end: end, exchanges: 1, firstIndex: e.Index})
			continue
		}
		r := &runs[len(runs)-1]
		r.end = end
		r.exchanges++
	}

	bands := make([]ModelBand, len(runs))
	for i, r := range runs {
		bands[i] = ModelBand{
			Model:      r.model,
			LeftPct:    pct(float64(r.start), float64(span)),
			WidthPct:   math.Max(bandMinWidthPct, pct(float64(r.end-r.start), float64(span))),
			Exchanges:  r.exchanges,
			FirstIndex: r.firstIndex,
		}
	}
	return bands
}

// modelSwitches counts the transitions between contiguous model runs (one fewer
// than the number of runs), never negative.
func modelSwitches(exchanges []Exchange) int {
	runs := 0
	for i, e := range exchanges {
		if i == 0 || exchanges[i-1].Model != e.Model {
			runs++
		}
	}
	if runs == 0 {
		return 0
	}
	return runs - 1
}

// overviewBuckets buckets exchanges by their timeline offset into
// overviewBucketCount columns, summing tokens and flagging errors per column.
func overviewBuckets(exchanges []Exchange, offsets []int64, span int64) []OverviewBucket {
	buckets := make([]OverviewBucket, overviewBucketCount)
	if span <= 0 {
		return buckets
	}
	errs := make([]int, overviewBucketCount)
	step := float64(span) / float64(overviewBucketCount)
	for i, e := range exchanges {
		k := int(float64(offsets[i]) / step)
		if k >= overviewBucketCount {
			k = overviewBucketCount - 1
		}
		buckets[k].Tokens += e.Tokens
		if e.Flags.HasErrors {
			errs[k]++
		}
	}
	for k := range buckets {
		switch {
		case errs[k] >= 2:
			buckets[k].ErrorLevel = 2
		case errs[k] == 1:
			buckets[k].ErrorLevel = 1
		}
	}
	return buckets
}

// busiestFiles tallies file operations by masked path and returns the busiest
// topFilesLimit. File entries carry already-masked paths from ExtractFiles.
func busiestFiles(messages []claude.Message) []Tally {
	counts := map[string]int{}
	for _, entry := range insights.ExtractFiles(messages, nil).Entries {
		counts[entry.FilePath]++
	}
	return topTally(counts, topFilesLimit)
}

// topCommands tallies bash commands by their redacted text and returns the top
// topCommandsLimit.
func topCommands(messages []claude.Message) []Tally {
	counts := map[string]int{}
	for _, c := range insights.ExtractBashCommands(messages) {
		counts[c.Command]++
	}
	return topTally(counts, topCommandsLimit)
}

// skills returns the session's skill invocations as name/count tallies, ordered
// by count descending via the shared extractor.
func skills(messages []claude.Message) []Tally {
	entries := insights.ExtractSkills(messages)
	out := make([]Tally, 0, len(entries))
	for _, e := range entries {
		out = append(out, Tally{Name: e.Name, Count: e.Count})
	}
	return out
}

// toolMix returns the session's tool invocation counts as name/count tallies,
// ordered by count descending via the shared extractor.
func toolMix(messages []claude.Message) []Tally {
	entries := insights.ExtractToolCounts(messages)
	out := make([]Tally, 0, len(entries))
	for _, e := range entries {
		out = append(out, Tally{Name: e.Name, Count: e.Count})
	}
	return out
}

// errorCount is the number of exchanges that saw an error result.
func errorCount(exchanges []Exchange) int {
	n := 0
	for _, e := range exchanges {
		if e.Flags.HasErrors {
			n++
		}
	}
	return n
}

// longestExchangeIndex is the index of the longest-running exchange, or -1 when
// there are none. Ties resolve to the earliest exchange.
func longestExchangeIndex(exchanges []Exchange) int {
	idx := -1
	var maxDur int64 = -1
	for _, e := range exchanges {
		if e.DurationMs > maxDur {
			maxDur = e.DurationMs
			idx = e.Index
		}
	}
	return idx
}

// topTokenSharePct is the percentage of total tokens spent in the
// topTokenShareCount heaviest exchanges, rounded, or 0 when there are no tokens.
func topTokenSharePct(exchanges []Exchange) int {
	total := totalTokens(exchanges)
	if total == 0 {
		return 0
	}
	toks := make([]int, len(exchanges))
	for i, e := range exchanges {
		toks[i] = e.Tokens
	}
	sort.Sort(sort.Reverse(sort.IntSlice(toks)))
	top := 0
	for i := 0; i < len(toks) && i < topTokenShareCount; i++ {
		top += toks[i]
	}
	return int(math.Round(float64(top) / float64(total) * 100))
}

func totalTokens(exchanges []Exchange) int {
	n := 0
	for _, e := range exchanges {
		n += e.Tokens
	}
	return n
}

func totalCostUSD(exchanges []Exchange) float64 {
	var c float64
	for _, e := range exchanges {
		c += e.CostUSD
	}
	return c
}

func totalDurationMs(exchanges []Exchange) int64 {
	var d int64
	for _, e := range exchanges {
		d += e.DurationMs
	}
	return d
}

func totalIdleMs(exchanges []Exchange) int64 {
	var d int64
	for _, e := range exchanges {
		d += e.IdleBeforeMs
	}
	return d
}

// topTally returns the highest-count entries of a name→count map, limited to
// `limit` and sorted by count descending (name ascending as a stable tiebreak).
// The result is always non-nil so it serializes as [] rather than null.
func topTally(counts map[string]int, limit int) []Tally {
	tallies := make([]Tally, 0, len(counts))
	for name, count := range counts {
		tallies = append(tallies, Tally{Name: name, Count: count})
	}
	sort.Slice(tallies, func(i, j int) bool {
		if tallies[i].Count != tallies[j].Count {
			return tallies[i].Count > tallies[j].Count
		}
		return tallies[i].Name < tallies[j].Name
	})
	if limit > 0 && len(tallies) > limit {
		tallies = tallies[:limit]
	}
	return tallies
}

// pct returns value/total*100, or 0 when total is non-positive.
func pct(value, total float64) float64 {
	if total <= 0 {
		return 0
	}
	return value / total * 100
}

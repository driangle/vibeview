// Package features exposes runtime feature toggles shared by the CLI and the
// web server.
package features

import (
	"os"
	"strconv"
)

// CostEnvVar is the environment variable that gates cost ($) display.
const CostEnvVar = "VIBEVIEW_COST_ENABLED"

// CostUIEnabled reports whether cost ($) figures should be shown in the CLI
// output and the web UI.
//
// Cost display is OFF by default while token→cost estimation is being reworked
// for accuracy (see docs/cost.md). Set VIBEVIEW_COST_ENABLED to a truthy value
// (1, t, true) to re-enable it at runtime for both surfaces — no rebuild needed.
// The pricing package and all cost computation remain in place regardless.
func CostUIEnabled() bool {
	enabled, _ := strconv.ParseBool(os.Getenv(CostEnvVar))
	return enabled
}

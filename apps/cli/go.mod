module github.com/driangle/vibeview

go 1.22.0

require (
	github.com/driangle/vibeview/apps/lib v0.2.1
	github.com/fsnotify/fsnotify v1.9.0
	github.com/skip2/go-qrcode v0.0.0-20200617195104-da1b6568686e
	github.com/spf13/cobra v1.10.2
	gopkg.in/yaml.v3 v3.0.1
)

replace github.com/driangle/vibeview/apps/lib => ../lib

require (
	github.com/inconshreveable/mousetrap v1.1.0 // indirect
	github.com/spf13/pflag v1.0.9 // indirect
	golang.org/x/sys v0.13.0 // indirect
)

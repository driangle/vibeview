package redact

import (
	"testing"
)

func TestRedactSecrets(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "password flag",
			input: "mysql --password=hunter2 --host=localhost",
			want:  "mysql --password=[REDACTED] --host=localhost",
		},
		{
			name:  "token flag",
			input: "cli --token=abc123xyz",
			want:  "cli --token=[REDACTED]",
		},
		{
			name:  "secret flag",
			input: "deploy --secret=s3cr3t",
			want:  "deploy --secret=[REDACTED]",
		},
		{
			name:  "authorization header",
			input: `curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.test" https://api.example.com`,
			want:  `curl -H "Authorization: Bearer [REDACTED]" https://api.example.com`,
		},
		{
			name:  "env var API_KEY",
			input: "API_KEY=sk-1234567890abcdef some-command",
			want:  "API_KEY=[REDACTED] some-command",
		},
		{
			name:  "env var DATABASE_URL",
			input: "DATABASE_URL=postgres://user:pass@host/db",
			want:  "DATABASE_URL=[REDACTED]",
		},
		{
			name:  "ANTHROPIC_API_KEY",
			input: "export ANTHROPIC_API_KEY=sk-ant-abc123",
			want:  "export ANTHROPIC_API_KEY=[REDACTED]",
		},
		{
			name:  "bearer token in text",
			input: "using token Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9 for auth",
			want:  "using token Bearer [REDACTED] for auth",
		},
		{
			name:  "postgres connection string",
			input: "connecting to postgres://admin:supersecret@db.example.com:5432/mydb",
			want:  "connecting to postgres://admin:[REDACTED]@db.example.com:5432/mydb",
		},
		{
			name:  "mongodb connection string",
			input: "mongodb+srv://user:p4ssw0rd@cluster.mongodb.net/db",
			want:  "mongodb+srv://user:[REDACTED]@cluster.mongodb.net/db",
		},
		{
			name:  "ssh private key",
			input: "key is -----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1234\n-----END RSA PRIVATE KEY-----",
			want:  "key is -----BEGIN RSA PRIVATE KEY-----\n[REDACTED]\n-----END RSA PRIVATE KEY-----",
		},
		{
			name:  "no secrets",
			input: "ls -la /home/user/project",
			want:  "ls -la /home/user/project",
		},
		{
			name:  "empty string",
			input: "",
			want:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := RedactSecrets(tt.input)
			if got != tt.want {
				t.Errorf("RedactSecrets(%q)\n  got:  %q\n  want: %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestMaskHomePath(t *testing.T) {
	origHome := homeDir
	defer func() { homeDir = origHome }()

	homeDir = "/Users/testuser"

	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "path under home",
			input: "/Users/testuser/project/src/main.go",
			want:  "~/project/src/main.go",
		},
		{
			name:  "home dir exactly",
			input: "/Users/testuser",
			want:  "~",
		},
		{
			name:  "path not under home",
			input: "/var/log/syslog",
			want:  "/var/log/syslog",
		},
		{
			name:  "empty string",
			input: "",
			want:  "",
		},
		{
			name:  "similar prefix but different",
			input: "/Users/testuser2/file.go",
			want:  "/Users/testuser2/file.go",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := MaskHomePath(tt.input)
			if got != tt.want {
				t.Errorf("MaskHomePath(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

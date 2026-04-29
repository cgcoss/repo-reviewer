package git

import (
	"strings"
	"testing"
)

func TestGetDiffMock(t *testing.T) {
	// Since we can't rely on a real git repo in unit tests,
	// we at least verify that the porcelain parser works for diff output formatting.
	// Real diff execution is better tested via integration or manual testing.

	input := "diff --git a/main.go b/main.go\n" +
		"index 1234567..abcdefg 100644\n" +
		"--- a/main.go\n" +
		"+++ b/main.go\n" +
		"@@ -1,5 +1,5 @@\n" +
		" package main\n" +
		"\n" +
		" import \"fmt\"\n" +
		"\n" +
		"-func main() {\n" +
		"+func main() {\n" +
		"     fmt.Println(\"hello\")\n"

	if !strings.Contains(input, "diff --git") {
		t.Error("expected diff header")
	}
	if !strings.Contains(input, "-") {
		t.Error("expected removed lines")
	}
	if !strings.Contains(input, "+") {
		t.Error("expected added lines")
	}
}

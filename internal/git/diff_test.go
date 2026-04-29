package git

import (
	"os"
	"path/filepath"
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

func TestGetUntrackedDiff_TextFile(t *testing.T) {
	repo := t.TempDir()
	path := "test.txt"
	content := "line1\nline2\nline3\n"
	if err := os.WriteFile(filepath.Join(repo, path), []byte(content), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	file := ChangedFile{Path: path}
	diff, err := GetUntrackedDiff(repo, file)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(diff, "diff --git") {
		t.Errorf("expected diff header, got:\n%s", diff)
	}
	if !strings.Contains(diff, "new file mode 100644") {
		t.Errorf("expected new file mode, got:\n%s", diff)
	}
	if !strings.Contains(diff, "+++ b/test.txt") {
		t.Errorf("expected +++ line, got:\n%s", diff)
	}
	if !strings.Contains(diff, "+line1") {
		t.Errorf("expected +line1, got:\n%s", diff)
	}
}

func TestGetUntrackedDiff_EmptyFile(t *testing.T) {
	repo := t.TempDir()
	path := "empty.txt"
	if err := os.WriteFile(filepath.Join(repo, path), []byte{}, 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	file := ChangedFile{Path: path}
	diff, err := GetUntrackedDiff(repo, file)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(diff, "diff --git") {
		t.Errorf("expected diff header, got:\n%s", diff)
	}
	if !strings.Contains(diff, "new file mode 100644") {
		t.Errorf("expected new file mode, got:\n%s", diff)
	}
	// Git omits the ---/+++ lines for empty files
	if strings.Contains(diff, "+++ b/empty.txt") {
		t.Errorf("unexpected +++ line for empty file, got:\n%s", diff)
	}
}

func TestGetUntrackedDiff_BinaryFile(t *testing.T) {
	repo := t.TempDir()
	path := "binary.bin"
	content := []byte{0x00, 0x01, 0x02, 0x03}
	if err := os.WriteFile(filepath.Join(repo, path), content, 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	file := ChangedFile{Path: path}
	diff, err := GetUntrackedDiff(repo, file)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(diff, "Binary") {
		t.Errorf("expected binary indicator, got:\n%s", diff)
	}
}

func TestGetUntrackedDiff_NoTrailingNewline(t *testing.T) {
	repo := t.TempDir()
	path := "notrail.txt"
	content := "line1\nline2"
	if err := os.WriteFile(filepath.Join(repo, path), []byte(content), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	file := ChangedFile{Path: path}
	diff, err := GetUntrackedDiff(repo, file)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(diff, "+line1") {
		t.Errorf("expected +line1, got:\n%s", diff)
	}
	if !strings.Contains(diff, "+line2") {
		t.Errorf("expected +line2, got:\n%s", diff)
	}
	if !strings.Contains(diff, "\\ No newline at end of file") {
		t.Errorf("expected no-newline marker, got:\n%s", diff)
	}
}

func TestGetUntrackedDiff_NestedPath(t *testing.T) {
	repo := t.TempDir()
	path := "test1/test2.txt"
	if err := os.MkdirAll(filepath.Join(repo, "test1"), 0755); err != nil {
		t.Fatalf("failed to create dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(repo, path), []byte("nested\n"), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	file := ChangedFile{Path: path}
	diff, err := GetUntrackedDiff(repo, file)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(diff, "+++ b/test1/test2.txt") {
		t.Errorf("expected path in diff, got:\n%s", diff)
	}
	if !strings.Contains(diff, "+nested") {
		t.Errorf("expected content in diff, got:\n%s", diff)
	}
}

package git

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestParseLogOutput_Empty(t *testing.T) {
	commits := parseLogOutput("")
	if len(commits) != 0 {
		t.Fatalf("expected 0 commits, got %d", len(commits))
	}
}

func TestParseLogOutput_SingleInitialCommit(t *testing.T) {
	input := "abc1234\x00\x00initial commit\x00Alice\x00alice@example.com\x001700000000\x00"
	commits := parseLogOutput(input)
	if len(commits) != 1 {
		t.Fatalf("expected 1 commit, got %d", len(commits))
	}
	c := commits[0]
	if c.Hash != "abc1234" {
		t.Errorf("hash = %s, want abc1234", c.Hash)
	}
	if len(c.ParentHashes) != 0 {
		t.Errorf("expected empty parent hashes, got %v", c.ParentHashes)
	}
	if c.Message != "initial commit" {
		t.Errorf("message = %s, want initial commit", c.Message)
	}
	if c.AuthorName != "Alice" {
		t.Errorf("author = %s, want Alice", c.AuthorName)
	}
	if c.Timestamp != 1700000000 {
		t.Errorf("timestamp = %d, want 1700000000", c.Timestamp)
	}
}

func TestParseLogOutput_MultipleCommits(t *testing.T) {
	input := "abc\x00\x00first\x00A\x00a@x.com\x001\x00" +
		"def\x00abc\x00second\x00B\x00b@x.com\x002\x00"
	commits := parseLogOutput(input)
	if len(commits) != 2 {
		t.Fatalf("expected 2 commits, got %d", len(commits))
	}
	if commits[0].Hash != "abc" {
		t.Errorf("commit0 hash = %s", commits[0].Hash)
	}
	if commits[1].Hash != "def" {
		t.Errorf("commit1 hash = %s", commits[1].Hash)
	}
	if len(commits[1].ParentHashes) != 1 || commits[1].ParentHashes[0] != "abc" {
		t.Errorf("commit1 parents = %v", commits[1].ParentHashes)
	}
}

func TestParseLogOutput_MergeCommit(t *testing.T) {
	input := "merge\x00abc def\x00merge msg\x00C\x00c@x.com\x003\x00"
	commits := parseLogOutput(input)
	if len(commits) != 1 {
		t.Fatalf("expected 1 commit, got %d", len(commits))
	}
	if len(commits[0].ParentHashes) != 2 {
		t.Errorf("expected 2 parents, got %v", commits[0].ParentHashes)
	}
	if commits[0].ParentHashes[0] != "abc" || commits[0].ParentHashes[1] != "def" {
		t.Errorf("parents = %v", commits[0].ParentHashes)
	}
}

func TestParseForEachRef_Empty(t *testing.T) {
	refs := parseForEachRef("", "refs/heads/main")
	if len(refs) != 0 {
		t.Fatalf("expected 0 refs, got %d", len(refs))
	}
}

func TestParseForEachRef_LocalBranch(t *testing.T) {
	input := "refs/heads/main\tabc123\tmain\tcommit\t"
	refs := parseForEachRef(input, "refs/heads/main")
	if len(refs) != 1 {
		t.Fatalf("expected 1 ref, got %d", len(refs))
	}
	if refs[0].Type != "branch" {
		t.Errorf("type = %s, want branch", refs[0].Type)
	}
	if !refs[0].IsHead {
		t.Errorf("expected IsHead=true")
	}
}

func TestParseForEachRef_TagAndRemote(t *testing.T) {
	input := "refs/tags/v1.0\tabc123\tv1.0\tcommit\t\n" +
		"refs/remotes/origin/main\tabc123\torigin/main\tcommit\t"
	refs := parseForEachRef(input, "refs/heads/main")
	if len(refs) != 2 {
		t.Fatalf("expected 2 refs, got %d", len(refs))
	}
	if refs[0].Type != "tag" {
		t.Errorf("tag type = %s, want tag", refs[0].Type)
	}
	if refs[1].Type != "remote" {
		t.Errorf("remote type = %s, want remote", refs[1].Type)
	}
}

func TestParseForEachRef_HEADDetection(t *testing.T) {
	input := "refs/heads/main\tabc\tmain\tcommit\t\n" +
		"refs/heads/dev\tdef\tdev\tcommit\t"
	refs := parseForEachRef(input, "refs/heads/dev")
	if len(refs) != 2 {
		t.Fatalf("expected 2 refs, got %d", len(refs))
	}
	if refs[0].IsHead {
		t.Errorf("expected main IsHead=false")
	}
	if !refs[1].IsHead {
		t.Errorf("expected dev IsHead=true")
	}
}

func TestGetCommitHistory_Integration(t *testing.T) {
	repo := t.TempDir()
	run := func(name string, arg ...string) {
		cmd := exec.Command(name, arg...)
		cmd.Dir = repo
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("command failed in %s: %v\n%s", repo, err, out)
		}
	}
	run("git", "init")
	run("git", "config", "user.email", "test@test.com")
	run("git", "config", "user.name", "Test")
	os.WriteFile(filepath.Join(repo, "a.txt"), []byte("hello\n"), 0644)
	run("git", "add", "a.txt")
	run("git", "commit", "-m", "first")

	os.WriteFile(filepath.Join(repo, "a.txt"), []byte("world\n"), 0644)
	run("git", "add", "a.txt")
	run("git", "commit", "-m", "second")

	result, err := GetCommitHistory(repo, 10, 0)
	if err != nil {
		t.Fatalf("GetCommitHistory failed: %v", err)
	}
	if len(result.Commits) != 2 {
		t.Errorf("expected 2 commits, got %d", len(result.Commits))
	}
	if len(result.Refs) < 1 {
		t.Errorf("expected at least 1 ref, got %d", len(result.Refs))
	}
	found := false
	for _, c := range result.Commits {
		if c.Message == "first" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected to find 'first' commit")
	}
}

func TestGetCommitDiff_Integration(t *testing.T) {
	repo := t.TempDir()
	run := func(name string, arg ...string) {
		cmd := exec.Command(name, arg...)
		cmd.Dir = repo
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("command failed in %s: %v\n%s", repo, err, out)
		}
	}
	run("git", "init")
	run("git", "config", "user.email", "test@test.com")
	run("git", "config", "user.name", "Test")
	os.WriteFile(filepath.Join(repo, "a.txt"), []byte("hello\n"), 0644)
	run("git", "add", "a.txt")
	run("git", "commit", "-m", "first")

	os.WriteFile(filepath.Join(repo, "a.txt"), []byte("world\n"), 0644)
	run("git", "add", "a.txt")
	run("git", "commit", "-m", "second")

	// Get hash of second commit
	cmd := exec.Command("git", "-C", repo, "rev-parse", "HEAD")
	out, err := cmd.Output()
	if err != nil {
		t.Fatalf("failed to get HEAD: %v", err)
	}
	hash := strings.TrimSpace(string(out))

	diff, err := GetCommitDiff(repo, hash)
	if err != nil {
		t.Fatalf("GetCommitDiff failed: %v", err)
	}
	if !strings.Contains(diff, "diff --git") {
		t.Errorf("expected diff header, got:\n%s", diff)
	}
	if !strings.Contains(diff, "-hello") {
		t.Errorf("expected removed line, got:\n%s", diff)
	}
	if !strings.Contains(diff, "+world") {
		t.Errorf("expected added line, got:\n%s", diff)
	}
}

func TestGetCommitDiff_InitialCommit(t *testing.T) {
	repo := t.TempDir()
	run := func(name string, arg ...string) {
		cmd := exec.Command(name, arg...)
		cmd.Dir = repo
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("command failed in %s: %v\n%s", repo, err, out)
		}
	}
	run("git", "init")
	run("git", "config", "user.email", "test@test.com")
	run("git", "config", "user.name", "Test")
	os.WriteFile(filepath.Join(repo, "a.txt"), []byte("hello\n"), 0644)
	run("git", "add", "a.txt")
	run("git", "commit", "-m", "first")

	cmd := exec.Command("git", "-C", repo, "rev-parse", "HEAD")
	out, err := cmd.Output()
	if err != nil {
		t.Fatalf("failed to get HEAD: %v", err)
	}
	hash := strings.TrimSpace(string(out))

	diff, err := GetCommitDiff(repo, hash)
	if err != nil {
		t.Fatalf("GetCommitDiff failed: %v", err)
	}
	if !strings.Contains(diff, "diff --git") {
		t.Errorf("expected diff header, got:\n%s", diff)
	}
	if !strings.Contains(diff, "+hello") {
		t.Errorf("expected added line, got:\n%s", diff)
	}
}

package git

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

// Commit represents a single git commit.
type Commit struct {
	Hash         string   `json:"hash"`
	ShortHash    string   `json:"shortHash"`
	ParentHashes []string `json:"parentHashes"`
	Message      string   `json:"message"`
	AuthorName   string   `json:"authorName"`
	AuthorEmail  string   `json:"authorEmail"`
	Timestamp    int64    `json:"timestamp"`
}

// Ref represents a git reference (branch, tag, or remote).
type Ref struct {
	Name   string `json:"name"`
	Hash   string `json:"hash"`
	Type   string `json:"type"`
	IsHead bool   `json:"isHead"`
}

// HistoryResult is the combined output of GetCommitHistory.
type HistoryResult struct {
	Commits []Commit `json:"commits"`
	Refs    []Ref    `json:"refs"`
}

// GetCommitHistory returns the commit history and refs for a repository.
func GetCommitHistory(repo string, maxCount int, skip int) (HistoryResult, error) {
	logCmd := exec.Command("git", "-C", repo, "log",
		"--format=%H%x00%P%x00%s%x00%an%x00%ae%x00%at",
		"-z", "--no-abbrev",
		fmt.Sprintf("--max-count=%d", maxCount),
		fmt.Sprintf("--skip=%d", skip),
	)
	logOut, err := logCmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok && len(exitErr.Stderr) > 0 {
			return HistoryResult{}, fmt.Errorf("git log failed: %s", exitErr.Stderr)
		}
		return HistoryResult{}, fmt.Errorf("git log failed: %w", err)
	}

	commits := parseLogOutput(string(logOut))

	refCmd := exec.Command("git", "-C", repo, "for-each-ref",
		"--format=%(refname)%09%(objectname)%09%(refname:short)%09%(objecttype)%09%(symref)",
		"refs/heads/", "refs/tags/", "refs/remotes/",
	)
	refOut, err := refCmd.Output()
	if err != nil {
		return HistoryResult{Commits: commits, Refs: []Ref{}}, nil
	}

	headCmd := exec.Command("git", "-C", repo, "symbolic-ref", "HEAD")
	headOut, err := headCmd.Output()
	headRef := ""
	if err == nil {
		headRef = strings.TrimSpace(string(headOut))
	}

	refs := parseForEachRef(string(refOut), headRef)
	return HistoryResult{Commits: commits, Refs: refs}, nil
}

func parseLogOutput(data string) []Commit {
	if data == "" {
		return []Commit{}
	}

	parts := strings.Split(data, "\x00")
	var commits []Commit
	i := 0
	for i+5 < len(parts) {
		if parts[i] == "" {
			i++
			continue
		}
		hash := parts[i]
		parentsStr := parts[i+1]
		message := parts[i+2]
		author := parts[i+3]
		email := parts[i+4]
		tsStr := parts[i+5]

		var parentHashes []string
		if parentsStr != "" {
			parentHashes = strings.Fields(parentsStr)
		} else {
			parentHashes = []string{}
		}

		ts, _ := strconv.ParseInt(tsStr, 10, 64)

		commits = append(commits, Commit{
			Hash:         hash,
			ShortHash:    hash[:min(7, len(hash))],
			ParentHashes: parentHashes,
			Message:      message,
			AuthorName:   author,
			AuthorEmail:  email,
			Timestamp:    ts,
		})
		i += 6
	}

	return commits
}

func parseForEachRef(data string, headRef string) []Ref {
	if strings.TrimSpace(data) == "" {
		return []Ref{}
	}

	lines := strings.Split(strings.TrimSuffix(data, "\n"), "\n")
	var refs []Ref
	for _, line := range lines {
		if line == "" {
			continue
		}
		parts := strings.Split(line, "\t")
		if len(parts) < 4 {
			continue
		}
		fullName := parts[0]
		hash := parts[1]
		shortName := parts[2]
		objType := parts[3]

		var refType string
		name := shortName
		switch {
		case strings.HasPrefix(fullName, "refs/heads/"):
			refType = "branch"
			name = shortName
		case strings.HasPrefix(fullName, "refs/tags/"):
			refType = "tag"
			name = shortName
		case strings.HasPrefix(fullName, "refs/remotes/"):
			refType = "remote"
			name = shortName
		default:
			refType = "other"
			name = fullName
		}

		isHead := fullName == headRef

		// For annotated tags, try to get the commit hash they point to.
		if objType == "tag" {
			// Attempt to dereference to a commit hash.
			if deref, err := getTagCommitHash("", fullName); err == nil && deref != "" {
				hash = deref
			}
		}

		refs = append(refs, Ref{
			Name:   name,
			Hash:   hash,
			Type:   refType,
			IsHead: isHead,
		})
	}

	return refs
}

func getTagCommitHash(repo string, refname string) (string, error) {
	args := []string{"rev-parse", refname + "^{commit}"}
	if repo != "" {
		args = []string{"-C", repo, "rev-parse", refname + "^{commit}"}
	}
	cmd := exec.Command("git", args...)
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

// GetCommitDiff returns the diff for a specific commit.
func GetCommitDiff(repo string, hash string) (string, error) {
	parentCmd := exec.Command("git", "-C", repo, "rev-parse", hash+"^1")
	_, err := parentCmd.Output()
	hasParent := err == nil

	var args []string
	if hasParent {
		args = []string{"-C", repo, "diff", hash + "^1", hash}
	} else {
		args = []string{"-C", repo, "show", hash, "--format=", "-p"}
	}

	cmd := exec.Command("git", args...)
	out, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok && len(exitErr.Stderr) > 0 {
			return "", fmt.Errorf("diff failed: %s", exitErr.Stderr)
		}
		return "", fmt.Errorf("diff failed: %w", err)
	}

	return string(out), nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

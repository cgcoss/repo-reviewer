package git

import (
	"fmt"
	"os/exec"
	"strings"
)

// GetCurrentBranch returns the current Git branch name.
func GetCurrentBranch(repo string) (string, error) {
	cmd := exec.Command("git", "-C", repo, "rev-parse", "--abbrev-ref", "HEAD")
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get current branch: %w", err)
	}
	branch := strings.TrimSpace(string(out))
	if branch == "" {
		return "unknown", nil
	}
	return branch, nil
}

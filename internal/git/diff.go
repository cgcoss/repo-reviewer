package git

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
)

// GetDiff returns the diff for an unstaged file.
func GetDiff(repo string, file ChangedFile) (string, error) {
	if file.Untracked {
		return GetUntrackedDiff(repo, file)
	}

	var args []string
	if file.Staged {
		args = []string{"-C", repo, "diff", "--cached", "--", file.Path}
	} else {
		args = []string{"-C", repo, "diff", "--", file.Path}
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

// GetUntrackedDiff returns a synthetic diff for an untracked file.
func GetUntrackedDiff(repo string, file ChangedFile) (string, error) {
	// For untracked files, try to show a preview-like diff using --no-index
	nullDevice := "/dev/null"
	if runtime.GOOS == "windows" {
		nullDevice = "NUL"
	}

	cmd := exec.Command("git", "-C", repo, "diff", "--no-index", "--", nullDevice, file.Path)
	out, err := cmd.Output()
	if err != nil {
		// git diff --no-index exits with 1 when files differ, which is expected
		if exitErr, ok := err.(*exec.ExitError); ok && len(exitErr.Stderr) > 0 {
			return "", fmt.Errorf("untracked diff failed: %s", exitErr.Stderr)
		}
		// If we have output despite error code 1, return it
		if len(out) > 0 {
			return string(out), nil
		}
		return "", fmt.Errorf("untracked diff failed: %w", err)
	}
	return string(out), nil
}

// GetFileContent returns the raw content of a file for preview.
func GetFileContent(repo string, file ChangedFile) (string, error) {
	path := repo + string(os.PathSeparator) + file.Path
	content, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}
	return string(content), nil
}

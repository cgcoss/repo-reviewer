package git

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// CheckGitInstalled verifies that the git binary is available in PATH.
func CheckGitInstalled() error {
	_, err := exec.LookPath("git")
	if err != nil {
		return fmt.Errorf("git is not installed or not in PATH")
	}
	return nil
}

// ValidateRepo checks whether the given path is inside a Git repository.
func ValidateRepo(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("invalid path: %w", err)
	}

	info, err := os.Stat(abs)
	if err != nil {
		return "", fmt.Errorf("path does not exist: %w", err)
	}
	if !info.IsDir() {
		abs = filepath.Dir(abs)
	}

	cmd := exec.Command("git", "-C", abs, "rev-parse", "--show-toplevel")
	out, err := cmd.CombinedOutput()
	if err != nil {
		msg := strings.TrimSpace(string(out))
		if msg == "" {
			msg = "not a git repository"
		}
		return "", fmt.Errorf("%s", msg)
	}

	top := strings.TrimSpace(string(out))
	if top == "" {
		return "", fmt.Errorf("not a git repository")
	}
	return top, nil
}

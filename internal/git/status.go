package git

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
)

// ChangedFile represents a single changed file in the working tree.
type ChangedFile struct {
	ID        string `json:"id"`
	Path      string `json:"path"`
	OldPath   string `json:"oldPath,omitempty"`
	FileName  string `json:"fileName"`
	Status    string `json:"status"`
	Staged    bool   `json:"staged"`
	Untracked bool   `json:"untracked"`
}

// ParseStatus runs git status --porcelain=v1 -z and returns parsed ChangedFile entries.
func ParseStatus(repo string) ([]ChangedFile, error) {
	cmd := exec.Command("git", "-C", repo, "status", "--porcelain=v1", "-z", "--untracked-files=all")
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get git status: %w", err)
	}

	return parsePorcelainV1Z(string(out)), nil
}

// StatusFingerprint returns a deterministic string representing the current
// working tree status. It changes whenever ParseStatus would return different data.
func StatusFingerprint(repo string) (string, error) {
	cmd := exec.Command("git", "-C", repo, "status", "--porcelain=v1", "-z", "--untracked-files=all")
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get git status: %w", err)
	}
	return string(out), nil
}

func parsePorcelainV1Z(data string) []ChangedFile {
	files := []ChangedFile{}
	entries := strings.Split(data, "\x00")

	for i := 0; i < len(entries); i++ {
		e := entries[i]
		if len(e) < 3 {
			continue
		}

		// Porcelain v1 format: XY <path> or XY <orig_path>\x00<new_path> for renames
		x := e[0]
		y := e[1]
		// Must be space after status codes
		if e[2] != ' ' {
			continue
		}

		path := e[3:]
		var oldPath string

		// Handle rename
		if x == 'R' || y == 'R' {
			if i+1 < len(entries) {
				oldPath = path
				path = entries[i+1]
				i++
			}
		}

		fileName := filepath.Base(path)
		untracked := x == '?' && y == '?'

		if untracked {
			files = append(files, ChangedFile{
				ID:        path + "::untracked",
				Path:      path,
				FileName:  fileName,
				Status:    "??",
				Staged:    false,
				Untracked: true,
			})
			continue
		}

		xStaged := x != ' ' && x != '?'
		yUnstaged := y != ' ' && y != '?'

		if xStaged {
			files = append(files, ChangedFile{
				ID:       path + "::staged",
				Path:     path,
				OldPath:  oldPath,
				FileName: fileName,
				Status:   string(x),
				Staged:   true,
			})
		}

		if yUnstaged {
			files = append(files, ChangedFile{
				ID:        path + "::unstaged",
				Path:      path,
				OldPath:   oldPath,
				FileName:  fileName,
				Status:    string(y),
				Staged:    false,
				Untracked: false,
			})
		}
	}

	return files
}

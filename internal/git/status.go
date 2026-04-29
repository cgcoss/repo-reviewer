package git

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
)

// ChangedFile represents a single changed file in the working tree.
type ChangedFile struct {
	Path      string `json:"path"`
	OldPath   string `json:"oldPath,omitempty"`
	FileName  string `json:"fileName"`
	Status    string `json:"status"`
	Staged    bool   `json:"staged"`
	Untracked bool   `json:"untracked"`
}

// ParseStatus runs git status --porcelain=v1 -z and returns parsed ChangedFile entries.
func ParseStatus(repo string) ([]ChangedFile, error) {
	cmd := exec.Command("git", "-C", repo, "status", "--porcelain=v1", "-z")
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get git status: %w", err)
	}

	return parsePorcelainV1Z(string(out)), nil
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
		staged := x != ' ' && x != '?'
		untracked := x == '?' && y == '?'

		status := ""
		if untracked {
			status = "??"
		} else {
			if staged {
				status = string(x)
			} else if y != ' ' {
				status = string(y)
			}
		}

		files = append(files, ChangedFile{
			Path:      path,
			OldPath:   oldPath,
			FileName:  fileName,
			Status:    status,
			Staged:    staged,
			Untracked: untracked,
		})
	}

	return files
}

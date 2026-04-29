package git

import (
	"testing"
)

func TestParsePorcelainV1Z(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected []ChangedFile
	}{
		{
			name:  "empty",
			input: "",
			expected: []ChangedFile{},
		},
		{
			name:  "single modified unstaged",
			input: " M src/main.go\x00",
			expected: []ChangedFile{
				{Path: "src/main.go", FileName: "main.go", Status: "M", Staged: false, Untracked: false},
			},
		},
		{
			name:  "single modified staged",
			input: "M  src/main.go\x00",
			expected: []ChangedFile{
				{Path: "src/main.go", FileName: "main.go", Status: "M", Staged: true, Untracked: false},
			},
		},
		{
			name:  "untracked file",
			input: "?? newfile.txt\x00",
			expected: []ChangedFile{
				{Path: "newfile.txt", FileName: "newfile.txt", Status: "??", Staged: false, Untracked: true},
			},
		},
		{
			name:  "added and deleted",
			input: "A  added.go\x00D  deleted.go\x00",
			expected: []ChangedFile{
				{Path: "added.go", FileName: "added.go", Status: "A", Staged: true, Untracked: false},
				{Path: "deleted.go", FileName: "deleted.go", Status: "D", Staged: true, Untracked: false},
			},
		},
		{
			name:  "rename",
			input: "R  old.go\x00new.go\x00",
			expected: []ChangedFile{
				{Path: "new.go", OldPath: "old.go", FileName: "new.go", Status: "R", Staged: true, Untracked: false},
			},
		},
		{
			name:  "multiple mixed",
			input: "M  staged.go\x00 M unstaged.go\x00?? untracked.txt\x00",
			expected: []ChangedFile{
				{Path: "staged.go", FileName: "staged.go", Status: "M", Staged: true, Untracked: false},
				{Path: "unstaged.go", FileName: "unstaged.go", Status: "M", Staged: false, Untracked: false},
				{Path: "untracked.txt", FileName: "untracked.txt", Status: "??", Staged: false, Untracked: true},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parsePorcelainV1Z(tt.input)
			if len(result) != len(tt.expected) {
				t.Fatalf("expected %d files, got %d", len(tt.expected), len(result))
			}
			for i, exp := range tt.expected {
				got := result[i]
				if got.Path != exp.Path {
					t.Errorf("file %d Path: expected %q, got %q", i, exp.Path, got.Path)
				}
				if got.OldPath != exp.OldPath {
					t.Errorf("file %d OldPath: expected %q, got %q", i, exp.OldPath, got.OldPath)
				}
				if got.FileName != exp.FileName {
					t.Errorf("file %d FileName: expected %q, got %q", i, exp.FileName, got.FileName)
				}
				if got.Status != exp.Status {
					t.Errorf("file %d Status: expected %q, got %q", i, exp.Status, got.Status)
				}
				if got.Staged != exp.Staged {
					t.Errorf("file %d Staged: expected %v, got %v", i, exp.Staged, got.Staged)
				}
				if got.Untracked != exp.Untracked {
					t.Errorf("file %d Untracked: expected %v, got %v", i, exp.Untracked, got.Untracked)
				}
			}
		})
	}
}

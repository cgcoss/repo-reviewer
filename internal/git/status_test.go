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
				{ID: "src/main.go::unstaged", Path: "src/main.go", FileName: "main.go", Status: "M", Staged: false, Untracked: false},
			},
		},
		{
			name:  "single modified staged",
			input: "M  src/main.go\x00",
			expected: []ChangedFile{
				{ID: "src/main.go::staged", Path: "src/main.go", FileName: "main.go", Status: "M", Staged: true, Untracked: false},
			},
		},
		{
			name:  "untracked file",
			input: "?? newfile.txt\x00",
			expected: []ChangedFile{
				{ID: "newfile.txt::untracked", Path: "newfile.txt", FileName: "newfile.txt", Status: "??", Staged: false, Untracked: true},
			},
		},
		{
			name:  "added and deleted",
			input: "A  added.go\x00D  deleted.go\x00",
			expected: []ChangedFile{
				{ID: "added.go::staged", Path: "added.go", FileName: "added.go", Status: "A", Staged: true, Untracked: false},
				{ID: "deleted.go::staged", Path: "deleted.go", FileName: "deleted.go", Status: "D", Staged: true, Untracked: false},
			},
		},
		{
			name:  "rename",
			input: "R  old.go\x00new.go\x00",
			expected: []ChangedFile{
				{ID: "new.go::staged", Path: "new.go", OldPath: "old.go", FileName: "new.go", Status: "R", Staged: true, Untracked: false},
			},
		},
		{
			name:  "multiple mixed",
			input: "M  staged.go\x00 M unstaged.go\x00?? untracked.txt\x00",
			expected: []ChangedFile{
				{ID: "staged.go::staged", Path: "staged.go", FileName: "staged.go", Status: "M", Staged: true, Untracked: false},
				{ID: "unstaged.go::unstaged", Path: "unstaged.go", FileName: "unstaged.go", Status: "M", Staged: false, Untracked: false},
				{ID: "untracked.txt::untracked", Path: "untracked.txt", FileName: "untracked.txt", Status: "??", Staged: false, Untracked: true},
			},
		},
		{
			name:  "dual status MM",
			input: "MM file.go\x00",
			expected: []ChangedFile{
				{ID: "file.go::staged", Path: "file.go", FileName: "file.go", Status: "M", Staged: true, Untracked: false},
				{ID: "file.go::unstaged", Path: "file.go", FileName: "file.go", Status: "M", Staged: false, Untracked: false},
			},
		},
		{
			name:  "dual status AM",
			input: "AM file.go\x00",
			expected: []ChangedFile{
				{ID: "file.go::staged", Path: "file.go", FileName: "file.go", Status: "A", Staged: true, Untracked: false},
				{ID: "file.go::unstaged", Path: "file.go", FileName: "file.go", Status: "M", Staged: false, Untracked: false},
			},
		},
		{
			name:  "dual status MD",
			input: "MD file.go\x00",
			expected: []ChangedFile{
				{ID: "file.go::staged", Path: "file.go", FileName: "file.go", Status: "M", Staged: true, Untracked: false},
				{ID: "file.go::unstaged", Path: "file.go", FileName: "file.go", Status: "D", Staged: false, Untracked: false},
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
				if got.ID != exp.ID {
					t.Errorf("file %d ID: expected %q, got %q", i, exp.ID, got.ID)
				}
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

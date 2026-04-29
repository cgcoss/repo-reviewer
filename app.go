package main

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"repo-reviewer/internal/git"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// OpenRepository validates the given path and returns a summary.
func (a *App) OpenRepository(path string) (RepoSummary, error) {
	if err := git.CheckGitInstalled(); err != nil {
		return RepoSummary{}, err
	}

	top, err := git.ValidateRepo(path)
	if err != nil {
		return RepoSummary{}, err
	}

	branch, err := git.GetCurrentBranch(top)
	if err != nil {
		branch = "unknown"
	}

	return RepoSummary{
		Path:   top,
		Branch: branch,
	}, nil
}

// GetStatus returns the list of changed files for the given repository.
func (a *App) GetStatus(path string) ([]git.ChangedFile, error) {
	return git.ParseStatus(path)
}

// GetDiff returns the diff for a specific file.
func (a *App) GetDiff(path string, file git.ChangedFile) (string, error) {
	return git.GetDiff(path, file)
}

// GetCurrentBranch returns the current branch for the repository.
func (a *App) GetCurrentBranch(path string) (string, error) {
	return git.GetCurrentBranch(path)
}

// SelectDirectory opens a directory dialog and returns the selected path.
func (a *App) SelectDirectory() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Git Repository",
	})
}

// RepoSummary holds basic repository information.
type RepoSummary struct {
	Path   string `json:"path"`
	Branch string `json:"branch"`
}

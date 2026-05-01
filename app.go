package main

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"repo-reviewer/internal/git"
	"repo-reviewer/internal/watcher"
)

// App struct
type App struct {
	ctx     context.Context
	watcher *watcher.Watcher
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.watcher = watcher.New(ctx)
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

	if a.watcher != nil {
		_ = a.watcher.Stop()
	}
	if a.watcher != nil {
		_ = a.watcher.Start(top)
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

// GetCommitHistory returns the commit history for the repository.
func (a *App) GetCommitHistory(path string, maxCount int, skip int) (git.HistoryResult, error) {
	return git.GetCommitHistory(path, maxCount, skip)
}

// GetCommitDiff returns the diff for a specific commit.
func (a *App) GetCommitDiff(path string, hash string) (string, error) {
	return git.GetCommitDiff(path, hash)
}

// SelectDirectory opens a directory dialog and returns the selected path.
func (a *App) SelectDirectory() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Git Repository",
	})
}

// Shutdown stops the filesystem watcher and performs cleanup.
func (a *App) Shutdown(ctx context.Context) {
	if a.watcher != nil {
		_ = a.watcher.Stop()
	}
}

// RepoSummary holds basic repository information.
type RepoSummary struct {
	Path   string `json:"path"`
	Branch string `json:"branch"`
}

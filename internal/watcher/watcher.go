package watcher

import (
	"context"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"repo-reviewer/internal/git"
)

// Watcher monitors a Git repository for filesystem changes and emits
// a Wails runtime event when the repository status may have changed.
type Watcher struct {
	ctx        context.Context
	watcher    *fsnotify.Watcher
	mu         sync.Mutex
	stopCh     chan struct{}
	debounce   time.Duration
	repoPath   string
	focused    bool
	lastStatus string
	unsubFocus func()
	unsubBlur  func()
}

// New creates a new Watcher bound to the given Wails context.
func New(ctx context.Context) *Watcher {
	return &Watcher{
		ctx:      ctx,
		debounce: 200 * time.Millisecond,
	}
}

// SetFocused tells the watcher whether the application window is focused.
// Polling for working-tree changes only happens while focused.
func (w *Watcher) SetFocused(focused bool) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.focused = focused
}

// Start begins watching the given repository path.
func (w *Watcher) Start(repoPath string) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	// Clean up any previous watcher.
	if w.watcher != nil {
		w.watcher.Close()
		w.watcher = nil
	}
	if w.stopCh != nil {
		select {
		case <-w.stopCh:
			// already closed
		default:
			close(w.stopCh)
		}
	}
	w.stopCh = make(chan struct{})
	w.repoPath = repoPath
	w.lastStatus = ""

	fsw, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	w.watcher = fsw

	// Watch specific .git subpaths for instant detection of git operations
	// (git add, checkout, pull, merge, etc.).
	gitDir := filepath.Join(repoPath, ".git")
	paths := []string{
		filepath.Join(gitDir, "index"),
		filepath.Join(gitDir, "HEAD"),
		filepath.Join(gitDir, "refs"),
	}
	for _, p := range paths {
		info, err := os.Stat(p)
		if err != nil {
			continue
		}
		if info.IsDir() {
			_ = filepath.WalkDir(p, func(subpath string, d os.DirEntry, err error) error {
				if err != nil {
					return nil
				}
				if d.IsDir() {
					_ = fsw.Add(subpath)
				}
				return nil
			})
		} else {
			_ = fsw.Add(p)
		}
	}

	// Listen to frontend focus events so we only poll while the window is active.
	w.unsubFocus = runtime.EventsOn(w.ctx, "window:focused", func(...interface{}) {
		w.SetFocused(true)
	})
	w.unsubBlur = runtime.EventsOn(w.ctx, "window:blurred", func(...interface{}) {
		w.SetFocused(false)
	})

	go w.loop()

	return nil
}

func (w *Watcher) loop() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	var timer *time.Timer
	for {
		select {
		case <-w.stopCh:
			return
		case <-ticker.C:
			w.mu.Lock()
			focused := w.focused
			w.mu.Unlock()
			if focused {
				w.emit()
			}
		case event, ok := <-w.watcher.Events:
			if !ok {
				return
			}
			if w.shouldIgnore(event) {
				continue
			}
			if timer != nil {
				timer.Stop()
			}
			timer = time.AfterFunc(w.debounce, func() {
				if w.ctx.Err() != nil {
					return
				}
				w.emit()
			})
		case _, ok := <-w.watcher.Errors:
			if !ok {
				return
			}
		}
	}
}

// emit runs git status and emits git:status-changed only when the
// porcelain output actually differs from the last known state.
func (w *Watcher) emit() {
	w.mu.Lock()
	repoPath := w.repoPath
	w.mu.Unlock()

	if repoPath == "" {
		return
	}

	fp, err := git.StatusFingerprint(repoPath)
	if err != nil {
		return
	}

	w.mu.Lock()
	if fp == w.lastStatus {
		w.mu.Unlock()
		return
	}
	w.lastStatus = fp
	w.mu.Unlock()

	runtime.EventsEmit(w.ctx, "git:status-changed")
}

func (w *Watcher) shouldIgnore(event fsnotify.Event) bool {
	// Ignore permission-only changes.
	if event.Op == fsnotify.Chmod {
		return true
	}
	return false
}

// Stop halts the watcher and releases filesystem handles.
func (w *Watcher) Stop() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.unsubFocus != nil {
		w.unsubFocus()
		w.unsubFocus = nil
	}
	if w.unsubBlur != nil {
		w.unsubBlur()
		w.unsubBlur = nil
	}

	if w.stopCh != nil {
		select {
		case <-w.stopCh:
			// already closed
		default:
			close(w.stopCh)
		}
	}
	if w.watcher != nil {
		err := w.watcher.Close()
		w.watcher = nil
		return err
	}
	return nil
}

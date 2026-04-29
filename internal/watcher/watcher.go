package watcher

import (
	"context"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Watcher monitors a Git repository for filesystem changes and emits
// a Wails runtime event when the repository status may have changed.
type Watcher struct {
	ctx      context.Context
	watcher  *fsnotify.Watcher
	mu       sync.Mutex
	stopCh   chan struct{}
	debounce time.Duration
}

// New creates a new Watcher bound to the given Wails context.
func New(ctx context.Context) *Watcher {
	return &Watcher{
		ctx:      ctx,
		debounce: 200 * time.Millisecond,
	}
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

	fsw, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	w.watcher = fsw

	// Watch the working tree recursively, skipping .git.
	err = filepath.WalkDir(repoPath, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil // skip inaccessible paths
		}
		if d.IsDir() {
			if filepath.Base(path) == ".git" {
				return filepath.SkipDir
			}
			_ = fsw.Add(path)
		}
		return nil
	})
	if err != nil {
		fsw.Close()
		w.watcher = nil
		return err
	}

	// Watch specific .git subpaths.
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

	go w.loop()

	return nil
}

func (w *Watcher) loop() {
	var timer *time.Timer
	for {
		select {
		case <-w.stopCh:
			return
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
				runtime.EventsEmit(w.ctx, "git:status-changed")
			})
		case _, ok := <-w.watcher.Errors:
			if !ok {
				return
			}
		}
	}
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

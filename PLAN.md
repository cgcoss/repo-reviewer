# Plan: Real-Time Updates via File Watcher

## Problem Statement

The app currently requires the user to manually click the Refresh button or press `Cmd/Ctrl+R` to see the latest Git changes. There is no automatic detection of repository changes, which makes the workflow feel sluggish and requires constant manual intervention.

---

## Root Causes

1. **No filesystem monitoring**: The backend only reads Git status on explicit RPC calls. It does not watch the repository for changes.
2. **No push mechanism to frontend**: The frontend has no way to be notified that the repository changed. Wails provides an event system (`EventsEmit`/`EventsOn`) that is available in the runtime but completely unused by the application.
3. **No polling or auto-refresh loop**: The frontend does not poll, and there is no interval-based refresh.

---

## Solution Overview

Introduce a Go-based filesystem watcher using `fsnotify` that monitors the repository's `.git/` directory and working tree. When relevant changes are detected, the watcher emits a Wails runtime event (`git:status-changed`). The React frontend subscribes to this event and calls the existing `refresh()` function to update the UI.

A debounce window (e.g., 200ms) batches rapid cascading filesystem events (common during `git add`, `git checkout`, etc.) into a single refresh.

---

## Implementation Steps

### Step 1: Add `fsnotify` dependency

Run `go get github.com/fsnotify/fsnotify` to add the dependency to `go.mod` and `go.sum`.

---

### Step 2: Create `internal/watcher/watcher.go`

Create a new `Watcher` struct that:

- Holds an `fsnotify.Watcher` instance.
- Runs an event loop in a goroutine that:
  - Listens for `fsnotify` events.
  - Uses a debounce timer (200ms) to batch rapid events.
  - Calls `runtime.EventsEmit(ctx, "git:status-changed")` after the debounce window settles.
- Watches:
  - The repository working tree root (recursive) for unstaged/untracked file changes.
  - Key `.git/` subpaths for staged/branch changes:
    - `.git/index`
    - `.git/HEAD`
    - `.git/refs/`
- Exposes:
  - `Start(repoPath string) error`
  - `Stop() error`

**Guard against loops**: When the app itself calls `git status` or `git diff`, it does not write to the repo, so no special loop prevention is needed. However, the watcher should ignore events from the `.git/` directory that are not explicitly watched (e.g., `git gc` internal churn). Watching specific subpaths rather than the entire `.git/` directory avoids noise.

---

### Step 3: Update `app.go`

- Add a `watcher *watcher.Watcher` field to the `App` struct.
- In `OpenRepository()`:
  - If a watcher is already running, call `watcher.Stop()` first.
  - Create and start a new `Watcher` for the validated repository path.
- Add a `Shutdown()` method that stops the watcher.
- Ensure the Wails context (`a.ctx`) is passed to the watcher so it can emit runtime events.

---

### Step 4: Update `main.go`

- Add an `OnShutdown` callback to the Wails `options.App` configuration.
- In `OnShutdown`, call `app.Shutdown()` to cleanly stop the watcher and release filesystem handles.

---

### Step 5: Create `frontend/src/hooks/useGitWatcher.ts`

Create a React hook that:

- Accepts `onChange: () => void` and `enabled: boolean` as arguments.
- Uses `EventsOn("git:status-changed", onChange)` from `../../wailsjs/runtime/runtime` to subscribe to backend events.
- Returns a cleanup function that calls `EventsOff("git:status-changed")`.
- Only subscribes when `enabled` is true (i.e., when a repo is open).

---

### Step 6: Update `frontend/src/App.tsx`

- Import and call `useGitWatcher(refresh, repo !== null)`.
- The hook will automatically trigger `refresh()` whenever the backend detects a repository change.
- The existing manual Refresh button and `Cmd/Ctrl+R` shortcut continue to work unchanged.

---

## Files to Modify / Create

| File | Change |
|------|--------|
| `go.mod` / `go.sum` | Add `github.com/fsnotify/fsnotify` dependency |
| `internal/watcher/watcher.go` | **New** — `Watcher` struct with `fsnotify`, debouncing, and Wails event emission |
| `app.go` | Add `watcher` field; start/stop watcher lifecycle in `OpenRepository`; add `Shutdown()` |
| `main.go` | Add `OnShutdown` callback to call `app.Shutdown()` |
| `frontend/src/hooks/useGitWatcher.ts` | **New** — React hook subscribing to `git:status-changed` Wails event |
| `frontend/src/App.tsx` | Import and use `useGitWatcher` hook |

---

## Out of Scope

- No changes to `internal/git/` packages (status parsing, diff generation, branch detection).
- No changes to React components (`ChangeTree`, `DiffViewer`, `StatusBar`, `RepoPathInput`, etc.).
- No new Go-bound RPC methods. The existing `GetStatus`/`GetDiff`/`GetCurrentBranch` remain the only data-fetching methods.
- No polling or interval-based refresh in the frontend.
- No database, cache, or state management library changes.

---

## Verification

1. Open a repository in the app.
2. In a terminal, run `git add <file>` or edit a tracked file.
3. Observe that the file list in the sidebar updates automatically within ~200ms without clicking Refresh.
4. Confirm that manual Refresh (`Cmd/Ctrl+R` and the button) still works.
5. Switch branches in the terminal (`git checkout <branch>`) and confirm the branch name and file list update automatically.
6. Close the app and ensure no goroutine or file descriptor leaks occur (check via OS process monitoring if desired).

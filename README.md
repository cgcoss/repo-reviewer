# repo-reviewer

A lightweight desktop Git changes viewer built with Wails (Go + React + TypeScript + Tailwind CSS). It opens a local Git repository and displays working tree changes in an IntelliJ-style Git Changes panel.

## Features

- Browse and open local Git repositories
- View changed files grouped into:
  - **Staged Changes**
  - **Changes** (unstaged)
  - **Untracked Files**
- Click any file to see its unified diff
- Syntax-neutral diff highlighting (added/removed/context lines)
- Dark theme inspired by IntelliJ Darcula
- Refresh button and keyboard shortcut (`Cmd/Ctrl+R`)
- Arrow key navigation for the file list

## Setup

### Prerequisites

- Go 1.26+ (installed via asdf or otherwise)
- Node.js 22.14.0 (installed via asdf or otherwise)
- Wails CLI v2:
  ```bash
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  ```

### Install Dependencies

```bash
# Ensure Go and Node are available
asdf install

# Install frontend dependencies
cd frontend && npm install
```

## Development

Run the app in development mode with hot reload:

```bash
wails dev
```

This launches the desktop app and starts the Vite dev server for fast frontend iteration.

## Build

Build a production binary:

```bash
wails build
```

On macOS, this produces a signed `.app` bundle in `build/bin/repo-reviewer.app`.

## Testing

Run the Go backend tests:

```bash
go test ./internal/git/...
```

## Current Limitations

- **Read-only**: No staging, unstaging, committing, pushing, or branch management
- **Untracked diffs**: Shows a synthetic diff when possible; otherwise falls back to a placeholder message
- **No merge diff support**: Complex merge states may not render perfectly
- **No history graph**: Only shows the current working tree changes
- **Single repository at a time**: No multi-repo workspace support

## Architecture

- **Backend** (`internal/git/`): Native `git` CLI integration via `exec.Command`
  - `git.go` — Repository validation and git availability checks
  - `status.go` — Porcelain v1 parser (`git status --porcelain=v1 -z`)
  - `diff.go` — Diff generation for staged, unstaged, and untracked files
  - `branch.go` — Current branch detection
- **Frontend** (`frontend/src/`): React + TypeScript + Tailwind CSS
  - `App.tsx` — Root layout, state management, keyboard shortcuts
  - `components/` — Sidebar, change tree, diff viewer, status bar
  - `hooks/useWails.ts` — Typed wrappers around Wails-generated bindings

## License

MIT

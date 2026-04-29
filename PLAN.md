# Plan: Fix Untracked/Unstaged Changes Handling

## Problem Statement

The app does not properly handle files that have both staged and unstaged modifications. In git porcelain v1 format, a file can have two status characters (e.g., `MM`, `AM`, `MD`) indicating changes in both the index (staged) and working tree (unstaged). The current implementation collapses these into a single `ChangedFile` entry representing only the staged portion, making the unstaged changes completely invisible to the user.

Additionally, untracked files currently have a poor error fallback in the UI when diff generation fails.

---

## Root Causes

### 1. Dual-Status Files Are Collapsed
**File:** `internal/git/status.go:31-87`

The `parsePorcelainV1Z` function reads a single porcelain entry like `MM file.go` and produces a single `ChangedFile` with `Staged: true`. The unstaged modification (Y status) is parsed but never emitted as a separate entry. This means:
- `MM file.go` → one entry `{staged: true, status: "M"}` — unstaged diff is inaccessible
- `AM file.go` → one entry `{staged: true, status: "A"}` — unstaged diff is inaccessible

### 2. Frontend Uses `path` as Unique Key
**File:** `frontend/src/components/ChangeTree.tsx:29`

React keys are based on `file.path`. If we fix (1) by emitting two entries for the same path, keys will collide. Similarly, `App.tsx` uses `files.findIndex((f) => f.path === selectedFile.path)` which would match the wrong entry.

### 3. Untracked Diff Error UX Is Poor
**File:** `frontend/src/App.tsx:107-108`

When `GetUntrackedDiff` throws, the catch block sets `diff` to a raw string `"Untracked file: no diff available yet"`. This gets piped into `parseUnifiedDiff`, rendering as a plain header row instead of a proper error state.

---

## Solution Overview

1. **Emit two `ChangedFile` entries** for dual-status files (one staged, one unstaged)
2. **Add a unique `id` field** to `ChangedFile` to disambiguate entries for the same path
3. **Update frontend keys and selection logic** to use `id` instead of `path`
4. **Improve untracked diff error handling** to display a clear message instead of a pseudo-diff

---

## Implementation Steps

### Step 1: Backend — Add `id` field and fix parser (`internal/git/status.go`)

- Add `ID string json:"id"` to `ChangedFile` struct
- Rewrite `parsePorcelainV1Z` to handle dual-status entries:
  - When both X and Y are non-space and non-`?` (e.g., `MM`, `AM`), emit **two** entries:
    - `ID = path + "::staged"`, `Staged: true`, `Status` from X column
    - `ID = path + "::unstaged"`, `Staged: false`, `Untracked: false`, `Status` from Y column
  - When only X is non-space (purely staged): one entry with `ID = path + "::staged"`
  - When only Y is non-space (purely unstaged): one entry with `ID = path + "::unstaged"`
  - Untracked `??` entries: one entry with `ID = path + "::untracked"`

### Step 2: Backend — Update tests (`internal/git/status_test.go`)

- Update existing test expectations to include the `ID` field
- Add new test cases for dual-status scenarios:
  - `MM file.go` → two entries (staged M, unstaged M)
  - `AM file.go` → two entries (staged A, unstaged M)
  - `MD file.go` → two entries (staged M, unstaged D)

### Step 3: Frontend — Update types (`frontend/src/types/index.ts`)

- Add `id: string` to the `ChangedFile` interface

### Step 4: Frontend — Update ChangeTree (`frontend/src/components/ChangeTree.tsx`)

- Change `key={file.path}` to `key={file.id}`
- Update `selectedPath` prop to accept `string | null` (no type change, but internal matching should use `id`)

### Step 5: Frontend — Update App (`frontend/src/App.tsx`)

- Change `selectedFile` state to track by `id`
- Update `refresh()`:
  - Match existing `selectedFile` by `id` instead of `path`
- Update `selectFile()`:
  - Use `file.id` for selection state
- Update keyboard navigation (`ArrowUp`/`ArrowDown`):
  - Match by `id` instead of `path`
- Update untracked diff error handling:
  - Instead of setting `diff` to a raw string, show a proper empty/error state or set `error` state

### Step 6: Verify

- Run Go tests: `go test ./internal/git/...`
- Check frontend TypeScript compilation
- Manually test with a repo containing dual-status files (`MM`, `AM`)

---

## Files to Modify

| File | Changes |
|------|---------|
| `internal/git/status.go` | Add `ID` field; rewrite `parsePorcelainV1Z` |
| `internal/git/status_test.go` | Add dual-status test cases; verify `ID` field |
| `frontend/src/types/index.ts` | Add `id: string` to `ChangedFile` |
| `frontend/src/components/ChangeTree.tsx` | Use `file.id` as React key |
| `frontend/src/App.tsx` | Use `id` for selection/matching; improve untracked error UX |

---

## Out of Scope

- `internal/git/diff.go` — no changes needed; `GetDiff` already branches on `Staged`/`Untracked` correctly
- `internal/git/git.go` — no changes needed
- `frontend/src/utils/diffParser.ts` — no changes needed; just don't feed it raw error strings

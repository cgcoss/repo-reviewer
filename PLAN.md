# Side-by-Side Diff Viewer — Implementation Plan

## Goal
Replace the unified diff viewer with a side-by-side diff viewer.

## Backend
No backend changes needed. Keep using `git diff` in unified format.

## Frontend

### 1. `frontend/src/utils/diffParser.ts` (new)
- Parse unified diff text into structured rows (`SideBySideRow[]`)
- Handle hunk headers, context lines, removed lines, added lines, and file headers
- Pair removed and added lines into side-by-side rows
- Track line numbers for both sides

### 2. `frontend/src/components/DiffViewer.tsx` (modify)
- Use the new parser to convert diff text into rows
- Render a two-column table layout
- Apply existing color theme (`darcula-add`, `darcula-del`, etc.)

### 3. `frontend/src/components/DiffLine.tsx` (modify)
- Render individual rows with left/right content, line numbers, and colors
- Handle context, added, removed, hunk, and header row types

## Files Changed
| File | Action |
|------|--------|
| `frontend/src/utils/diffParser.ts` | Create |
| `frontend/src/components/DiffViewer.tsx` | Modify |
| `frontend/src/components/DiffLine.tsx` | Modify |

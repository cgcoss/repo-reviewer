import { useState, useEffect, useCallback, useRef } from "react";
import { EventsEmit } from "../wailsjs/runtime/runtime";
import { useWails } from "./hooks/useWails";
import { useGitWatcher } from "./hooks/useGitWatcher";
import type { ChangedFile, RepoSummary, Commit, Ref } from "./types";
import RepoPathInput from "./components/RepoPathInput";
import ChangeTree from "./components/ChangeTree";
import CommitHistory from "./components/CommitHistory";
import DiffViewer from "./components/DiffViewer";
import StatusBar from "./components/StatusBar";

export default function App() {
    const wails = useWails();

    const [repoPath, setRepoPath] = useState("");
    const [repo, setRepo] = useState<RepoSummary | null>(null);
    const [files, setFiles] = useState<ChangedFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<ChangedFile | null>(null);
    const [diff, setDiff] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<string | null>(null);

    const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
    const [bottomPanelHeight, setBottomPanelHeight] = useState(280);
    const [bottomPanelTab, setBottomPanelTab] = useState<"log">("log");
    const isResizingRef = useRef(false);
    const startYRef = useRef(0);
    const startHeightRef = useRef(0);

    const [logCommits, setLogCommits] = useState<Commit[]>([]);
    const [logRefs, setLogRefs] = useState<Ref[]>([]);
    const [logSkip, setLogSkip] = useState(0);
    const [logHasMore, setLogHasMore] = useState(true);
    const [logLoading, setLogLoading] = useState(false);
    const [selectedCommitHash, setSelectedCommitHash] = useState<string | null>(null);

    const stagedCount = files.filter((f) => f.staged).length;
    const untrackedCount = files.filter((f) => f.untracked).length;
    const changeCount = files.length - stagedCount - untrackedCount;

    const loadHistory = useCallback(async (skip: number) => {
        if (!repo) return;
        setLogLoading(true);
        try {
            const result = await wails.getCommitHistory(repo.path, 500, skip);
            if (skip === 0) {
                setLogCommits(result.commits);
                setLogRefs(result.refs);
            } else {
                setLogCommits((prev) => [...prev, ...result.commits]);
            }
            setLogHasMore(result.commits.length === 500);
            setLogSkip(skip + result.commits.length);
        } catch (e: any) {
            setError(e?.toString?.() || "Failed to load history");
        } finally {
            setLogLoading(false);
        }
    }, [repo, wails]);

    const loadMoreHistory = useCallback(() => loadHistory(logSkip), [logSkip, loadHistory]);

    const selectCommit = useCallback(
        async (hash: string) => {
            if (!repo) return;
            setSelectedCommitHash(hash);
            setSelectedFile(null);
            setError(null);
            try {
                const d = await wails.getCommitDiff(repo.path, hash);
                setDiff(d);
            } catch (e: any) {
                setDiff(null);
                setError(e?.toString?.() || "Failed to get commit diff");
            }
        },
        [repo, wails]
    );

    // Load log when bottom panel opens
    useEffect(() => {
        if (bottomPanelOpen && logCommits.length === 0) {
            loadHistory(0);
        }
    }, [bottomPanelOpen, logCommits.length, loadHistory]);

    const refresh = useCallback(async () => {
        if (!repo) return;
        setError(null);
        try {
            const status = await wails.getStatus(repo.path);
            setFiles(status);

            if (selectedFile) {
                const stillExists = status.find((f) => f.id === selectedFile.id);
                if (stillExists) {
                    const d = await wails.getDiff(repo.path, stillExists);
                    setDiff(d);
                    setSelectedFile(stillExists);
                } else {
                    setSelectedFile(null);
                    setDiff(null);
                }
            }

            if (bottomPanelOpen) {
                loadHistory(0);
            }

            const branch = await wails.getCurrentBranch(repo.path);
            setRepo((prev) => (prev ? { ...prev, branch } : prev));
            setLastRefresh(new Date().toLocaleTimeString());
        } catch (e: any) {
            setError(e?.toString?.() || "Refresh failed");
        }
    }, [repo, selectedFile, wails, loadHistory, bottomPanelOpen]);

    useGitWatcher(refresh, repo !== null);

    // Notify backend of window focus state so it can pause/resume polling.
    useEffect(() => {
        const onFocus = () => EventsEmit("window:focused");
        const onBlur = () => EventsEmit("window:blurred");
        window.addEventListener("focus", onFocus);
        window.addEventListener("blur", onBlur);
        if (document.hasFocus()) {
            EventsEmit("window:focused");
        }
        return () => {
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("blur", onBlur);
        };
    }, []);

    const openRepo = useCallback(async () => {
        setError(null);
        if (!repoPath.trim()) {
            setError("Please enter a path");
            return;
        }
        try {
            const summary = await wails.openRepository(repoPath.trim());
            setRepo(summary);
            const status = await wails.getStatus(summary.path);
            setFiles(status ?? []);
            setSelectedFile(null);
            setDiff(null);
            setSelectedCommitHash(null);
            setBottomPanelOpen(false);
            setLogCommits([]);
            setLogRefs([]);
            setLogSkip(0);
            setLogHasMore(true);
            setLastRefresh(new Date().toLocaleTimeString());
        } catch (e: any) {
            setRepo(null);
            setFiles([]);
            setError(e?.toString?.() || "Failed to open repository");
        }
    }, [repoPath, wails]);

    const browse = useCallback(async () => {
        try {
            const dir = await wails.selectDirectory();
            if (dir) {
                setRepoPath(dir);
                try {
                    const summary = await wails.openRepository(dir);
                    setRepo(summary);
                    const status = await wails.getStatus(summary.path);
                    setFiles(status ?? []);
                    setSelectedFile(null);
                    setDiff(null);
                    setSelectedCommitHash(null);
                    setBottomPanelOpen(false);
                    setLogCommits([]);
                    setLogRefs([]);
                    setLogSkip(0);
                    setLogHasMore(true);
                    setLastRefresh(new Date().toLocaleTimeString());
                    setError(null);
                } catch (e: any) {
                    setRepo(null);
                    setFiles([]);
                    setError(e?.toString?.() || "Failed to open repository");
                }
            }
        } catch (e: any) {
            setError(e?.toString?.() || "Browse failed");
        }
    }, [wails]);

    const selectFile = useCallback(
        async (file: ChangedFile) => {
            if (!repo) return;
            setSelectedFile(file);
            setSelectedCommitHash(null);
            setError(null);
            try {
                const d = await wails.getDiff(repo.path, file);
                setDiff(d);
            } catch (e: any) {
                if (file.untracked) {
                    setDiff(null);
                    setError(e?.toString?.() || "Untracked file: no diff available yet");
                } else {
                    setDiff(null);
                    setError(e?.toString?.() || "Failed to get diff");
                }
            }
        },
        [repo, wails]
    );

    // Resize handlers
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizingRef.current) return;
            const delta = startYRef.current - e.clientY;
            const newHeight = Math.max(120, Math.min(600, startHeightRef.current + delta));
            setBottomPanelHeight(newHeight);
        };
        const handleMouseUp = () => {
            isResizingRef.current = false;
        };
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    const startResize = useCallback((e: React.MouseEvent) => {
        isResizingRef.current = true;
        startYRef.current = e.clientY;
        startHeightRef.current = bottomPanelHeight;
    }, [bottomPanelHeight]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "r") {
                e.preventDefault();
                refresh();
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                if (bottomPanelOpen && logCommits.length > 0) {
                    const currentIndex = selectedCommitHash
                        ? logCommits.findIndex((c) => c.hash === selectedCommitHash)
                        : -1;
                    let nextIndex = currentIndex;
                    if (e.key === "ArrowDown") {
                        nextIndex = Math.min(currentIndex + 1, logCommits.length - 1);
                    } else {
                        nextIndex = Math.max(currentIndex - 1, 0);
                    }
                    if (nextIndex !== currentIndex && nextIndex >= 0) {
                        e.preventDefault();
                        selectCommit(logCommits[nextIndex].hash);
                    }
                } else {
                    if (files.length === 0) return;
                    const currentIndex = selectedFile
                        ? files.findIndex((f) => f.id === selectedFile.id)
                        : -1;
                    let nextIndex = currentIndex;
                    if (e.key === "ArrowDown") {
                        nextIndex = Math.min(currentIndex + 1, files.length - 1);
                    } else {
                        nextIndex = Math.max(currentIndex - 1, 0);
                    }
                    if (nextIndex !== currentIndex && nextIndex >= 0) {
                        e.preventDefault();
                        selectFile(files[nextIndex]);
                    }
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [files, refresh, selectFile, selectedFile, bottomPanelOpen, logCommits, selectedCommitHash, selectCommit]);

    const diffTitle = selectedFile?.fileName ?? (selectedCommitHash ? selectedCommitHash.slice(0, 7) : "");

    return (
        <div className="flex flex-col h-screen bg-darcula-bg text-darcula-text">
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-80 flex flex-col border-r border-darcula-border bg-darcula-bg shrink-0">
                    <RepoPathInput
                        path={repoPath}
                        onPathChange={setRepoPath}
                        onBrowse={browse}
                        onOpen={openRepo}
                        error={error}
                    />
                    <div className="flex items-center justify-between px-3 py-2 border-b border-darcula-border">
                        <span className="text-xs font-medium text-darcula-text">Changes</span>
                        <button
                            onClick={() => setBottomPanelOpen((prev) => !prev)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                bottomPanelOpen
                                    ? "bg-darcula-info text-white"
                                    : "bg-darcula-surface hover:bg-darcula-highlight text-darcula-text"
                            }`}
                            title="Toggle Log Panel"
                        >
                            Log
                        </button>
                    </div>
                    <ChangeTree
                        files={files}
                        selectedPath={selectedFile?.id ?? null}
                        onSelect={selectFile}
                    />
                </div>

                {/* Main diff viewer */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <DiffViewer diff={diff} fileName={diffTitle} />
                </div>
            </div>

            {/* Bottom panel */}
            {bottomPanelOpen && (
                <div
                    className="shrink-0 border-t border-darcula-border flex flex-col bg-darcula-bg"
                    style={{ height: bottomPanelHeight }}
                >
                    {/* Resize handle */}
                    <div
                        onMouseDown={startResize}
                        className="h-1.5 cursor-ns-resize hover:bg-darcula-info bg-transparent shrink-0"
                        title="Resize panel"
                    />
                    {/* Tab bar */}
                    <div className="flex border-b border-darcula-border shrink-0">
                        <button
                            onClick={() => setBottomPanelTab("log")}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                                bottomPanelTab === "log"
                                    ? "text-darcula-text border-b-2 border-darcula-info"
                                    : "text-darcula-muted hover:text-darcula-text"
                            }`}
                        >
                            Log
                        </button>
                    </div>
                    {/* Panel content */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {bottomPanelTab === "log" && (
                            <CommitHistory
                                commits={logCommits}
                                refs={logRefs}
                                selectedHash={selectedCommitHash}
                                onSelectCommit={selectCommit}
                                onLoadMore={loadMoreHistory}
                                hasMore={logHasMore}
                                isLoading={logLoading}
                            />
                        )}
                    </div>
                </div>
            )}

            <StatusBar
                branch={repo?.branch ?? "No repository"}
                changeCount={changeCount}
                stagedCount={stagedCount}
                untrackedCount={untrackedCount}
                lastRefresh={lastRefresh}
                onRefresh={refresh}
            />
        </div>
    );
}

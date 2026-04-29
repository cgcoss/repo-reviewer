import { useState, useEffect, useCallback } from "react";
import { useWails } from "./hooks/useWails";
import { useGitWatcher } from "./hooks/useGitWatcher";
import type { ChangedFile, RepoSummary } from "./types";
import RepoPathInput from "./components/RepoPathInput";
import ChangeTree from "./components/ChangeTree";
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

    const stagedCount = files.filter((f) => f.staged).length;
    const untrackedCount = files.filter((f) => f.untracked).length;
    const changeCount = files.length - stagedCount - untrackedCount;

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

            const branch = await wails.getCurrentBranch(repo.path);
            setRepo((prev) => (prev ? { ...prev, branch } : prev));
            setLastRefresh(new Date().toLocaleTimeString());
        } catch (e: any) {
            setError(e?.toString?.() || "Refresh failed");
        }
    }, [repo, selectedFile, wails]);

    useGitWatcher(refresh, repo !== null);

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
                // Auto-open after selection
                try {
                    const summary = await wails.openRepository(dir);
                    setRepo(summary);
                    const status = await wails.getStatus(summary.path);
                    setFiles(status ?? []);
                    setSelectedFile(null);
                    setDiff(null);
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
            setError(null);
            try {
                const d = await wails.getDiff(repo.path, file);
                setDiff(d);
            } catch (e: any) {
                if (file.untracked) {
                    setDiff(null);
                    setError("Untracked file: no diff available yet");
                } else {
                    setDiff(null);
                    setError(e?.toString?.() || "Failed to get diff");
                }
            }
        },
        [repo, wails]
    );

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "r") {
                e.preventDefault();
                refresh();
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
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
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [files, refresh, selectFile, selectedFile]);

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
                    <ChangeTree
                        files={files}
                        selectedPath={selectedFile?.id ?? null}
                        onSelect={selectFile}
                    />
                </div>

                {/* Main diff viewer */}
                <div className="flex-1 flex flex-col min-w-0">
                    <DiffViewer
                        diff={diff}
                        fileName={selectedFile?.fileName ?? ""}
                    />
                </div>
            </div>

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

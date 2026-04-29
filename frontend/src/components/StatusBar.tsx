import { GitBranch, RefreshCw } from "lucide-react";

interface StatusBarProps {
    branch: string;
    changeCount: number;
    stagedCount: number;
    untrackedCount: number;
    lastRefresh: string | null;
    onRefresh: () => void;
}

export default function StatusBar({
    branch,
    changeCount,
    stagedCount,
    untrackedCount,
    lastRefresh,
    onRefresh,
}: StatusBarProps) {
    return (
        <div className="flex items-center justify-between px-3 py-1.5 bg-darcula-surface border-t border-darcula-border text-xs text-darcula-muted select-none">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                    <GitBranch size={12} />
                    <span className="text-darcula-text font-medium">{branch}</span>
                </div>
                <div className="flex gap-3">
                    <span>
                        Changes: <strong className="text-darcula-text">{changeCount}</strong>
                    </span>
                    <span>
                        Staged: <strong className="text-darcula-text">{stagedCount}</strong>
                    </span>
                    <span>
                        Untracked: <strong className="text-darcula-text">{untrackedCount}</strong>
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {lastRefresh && (
                    <span className="text-darcula-muted">
                        Refreshed: {lastRefresh}
                    </span>
                )}
                <button
                    onClick={onRefresh}
                    title="Refresh (Ctrl/Cmd+R)"
                    className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-darcula-highlight transition-colors"
                >
                    <RefreshCw size={12} />
                    Refresh
                </button>
            </div>
        </div>
    );
}

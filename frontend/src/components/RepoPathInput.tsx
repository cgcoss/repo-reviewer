import { FolderOpen } from "lucide-react";

interface RepoPathInputProps {
    path: string;
    onPathChange: (path: string) => void;
    onBrowse: () => void;
    onOpen: () => void;
    error: string | null;
}

export default function RepoPathInput({ path, onPathChange, onBrowse, onOpen, error }: RepoPathInputProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            onOpen();
        }
    };

    return (
        <div className="flex flex-col gap-2 p-3 border-b border-darcula-border">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={path}
                    onChange={(e) => onPathChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter repository path..."
                    className="flex-1 min-w-0 bg-darcula-surface border border-darcula-border rounded px-2 py-1 text-sm text-darcula-text placeholder-darcula-muted focus:outline-none focus:border-darcula-info"
                />
                <button
                    onClick={onBrowse}
                    title="Browse"
                    className="flex items-center gap-1 px-2 py-1 bg-darcula-surface border border-darcula-border rounded text-xs hover:bg-darcula-highlight transition-colors"
                >
                    <FolderOpen size={14} />
                    Browse
                </button>
                <button
                    onClick={onOpen}
                    className="px-3 py-1 bg-darcula-info text-white rounded text-xs font-medium hover:opacity-90 transition-opacity"
                >
                    Open
                </button>
            </div>
            {error && (
                <div className="text-xs text-red-400">{error}</div>
            )}
        </div>
    );
}

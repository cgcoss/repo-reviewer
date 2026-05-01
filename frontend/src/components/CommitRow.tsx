import clsx from "clsx";
import type { CommitLayout } from "../utils/graphLayout";
import type { Commit, Ref } from "../types";

interface CommitRowProps {
    commit: Commit;
    layout: CommitLayout;
    refs: Ref[];
    isSelected: boolean;
    onClick: () => void;
}

function formatDate(ts: number): string {
    const d = new Date(ts * 1000);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function refBadgeClass(ref: Ref): string {
    if (ref.isHead) {
        return "bg-green-900/50 text-green-300";
    }
    switch (ref.type) {
        case "branch":
            return "bg-darcula-info/20 text-darcula-info";
        case "tag":
            return "bg-yellow-900/50 text-yellow-300";
        case "remote":
            return "bg-gray-700 text-gray-400";
        default:
            return "bg-gray-700 text-gray-400";
    }
}

export default function CommitRow({ commit, layout, refs, isSelected, onClick }: CommitRowProps) {
    return (
        <div
            onClick={onClick}
            className={clsx(
                "flex items-center gap-2 px-2 cursor-pointer text-xs select-none",
                isSelected ? "bg-darcula-highlight" : "hover:bg-darcula-surface/50"
            )}
            style={{ height: 36 }}
        >
            {/* Short hash */}
            <span className="text-darcula-muted text-[12px] font-mono shrink-0" style={{ width: 64 }}>
                {commit.shortHash}
            </span>

            {/* Refs */}
            <div className="flex items-center gap-1 shrink-0">
                {refs.map((ref) => (
                    <span
                        key={ref.name}
                        className={clsx(
                            "px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap",
                            refBadgeClass(ref)
                        )}
                    >
                        {ref.name}
                    </span>
                ))}
            </div>

            {/* Message */}
            <span className="truncate text-darcula-text text-xs flex-1 min-w-0">
                {commit.message}
            </span>

            {/* Author */}
            <span
                className="text-darcula-muted text-[11px] truncate shrink-0 text-right"
                style={{ width: 120 }}
            >
                {commit.authorName}
            </span>

            {/* Timestamp */}
            <span
                className="text-darcula-muted text-[11px] shrink-0 text-right"
                style={{ width: 100 }}
            >
                {formatDate(commit.timestamp)}
            </span>
        </div>
    );
}

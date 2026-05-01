import { computeGraphLayout } from "../utils/graphLayout";
import type { Commit, Ref } from "../types";
import CommitGraph from "./CommitGraph";
import CommitRow from "./CommitRow";

interface CommitHistoryProps {
    commits: Commit[];
    refs: Ref[];
    selectedHash: string | null;
    onSelectCommit: (hash: string) => void;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoading: boolean;
}

const ROW_HEIGHT = 36;

export default function CommitHistory({
    commits,
    refs,
    selectedHash,
    onSelectCommit,
    onLoadMore,
    hasMore,
    isLoading,
}: CommitHistoryProps) {
    const layout = computeGraphLayout(commits, refs);

    const refsByHash = new Map<string, Ref[]>();
    for (const ref of refs) {
        const list = refsByHash.get(ref.hash) || [];
        list.push(ref);
        refsByHash.set(ref.hash, list);
    }

    if (commits.length === 0) {
        return (
            <div className="flex items-center justify-center p-4 text-xs text-darcula-muted">
                No commits to display
            </div>
        );
    }

    return (
        <div className="overflow-auto flex-1 relative">
            <div className="flex">
                {/* Graph column */}
                <div className="shrink-0 sticky left-0 bg-darcula-bg z-10">
                    <CommitGraph layout={layout} rowHeight={ROW_HEIGHT} />
                </div>

                {/* Text column */}
                <div className="flex-1 min-w-0">
                    {commits.map((commit, i) => (
                        <CommitRow
                            key={commit.hash}
                            commit={commit}
                            layout={layout.commits[i]}
                            refs={refsByHash.get(commit.hash) || []}
                            isSelected={selectedHash === commit.hash}
                            onClick={() => onSelectCommit(commit.hash)}
                        />
                    ))}
                </div>
            </div>

            {hasMore && (
                <div className="py-2 flex justify-center">
                    <button
                        onClick={onLoadMore}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs rounded bg-darcula-surface hover:bg-darcula-highlight text-darcula-text transition-colors disabled:opacity-50"
                    >
                        {isLoading ? "Loading..." : "Load more"}
                    </button>
                </div>
            )}
        </div>
    );
}

import type { ChangedFile } from "../types";
import FileRow from "./FileRow";

interface ChangeTreeProps {
    files: ChangedFile[];
    selectedPath: string | null;
    onSelect: (file: ChangedFile) => void;
}

export default function ChangeTree({ files, selectedPath, onSelect }: ChangeTreeProps) {
    const changes = files.filter((f) => !f.staged && !f.untracked);
    const staged = files.filter((f) => f.staged);
    const untracked = files.filter((f) => f.untracked);

    const renderGroup = (
        title: string,
        items: ChangedFile[],
        count: number
    ) => {
        if (items.length === 0) return null;
        return (
            <div className="mb-2">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-darcula-muted bg-darcula-surface/30">
                    {title} ({count})
                </div>
                <div>
                    {items.map((file) => (
                        <FileRow
                            key={file.id}
                            file={file}
                            selected={selectedPath === file.id}
                            onClick={() => onSelect(file)}
                        />
                    ))}
                </div>
            </div>
        );
    };

    if (files.length === 0) {
        return (
            <div className="flex items-center justify-center p-4 text-xs text-darcula-muted">
                No changes detected
            </div>
        );
    }

    return (
        <div className="overflow-auto flex-1 min-h-0">
            {renderGroup("Staged Changes", staged, staged.length)}
            {renderGroup("Changes", changes, changes.length)}
            {renderGroup("Untracked Files", untracked, untracked.length)}
        </div>
    );
}

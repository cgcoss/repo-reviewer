import DiffLine from "./DiffLine";
import { parseUnifiedDiff } from "../utils/diffParser";

interface DiffViewerProps {
    diff: string | null;
    fileName: string;
}

export default function DiffViewer({ diff, fileName }: DiffViewerProps) {
    if (!diff) {
        return (
            <div className="flex-1 flex items-center justify-center text-darcula-muted text-sm">
                Select a file to view its diff
            </div>
        );
    }

    const rows = parseUnifiedDiff(diff);

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-darcula-bg">
            <div className="px-3 py-2 border-b border-darcula-border text-xs font-medium text-darcula-text truncate">
                {fileName}
            </div>
            <div className="flex-1 overflow-auto p-2">
                <table className="w-full border-collapse text-xs font-mono leading-5">
                    <tbody>
                        {rows.map((row, i) => (
                            <DiffLine key={i} row={row} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

import type { ChangedFile } from "../types";
import { FileCode, FilePlus, FileMinus, FileEdit, FileQuestion } from "lucide-react";
import clsx from "clsx";

interface FileRowProps {
    file: ChangedFile;
    selected: boolean;
    onClick: () => void;
}

function statusBadgeClass(status: string): string {
    switch (status) {
        case "M":
            return "bg-blue-900/50 text-blue-300";
        case "A":
            return "bg-green-900/50 text-green-300";
        case "D":
            return "bg-red-900/50 text-red-300";
        case "R":
            return "bg-purple-900/50 text-purple-300";
        case "??":
            return "bg-gray-700 text-gray-300";
        default:
            return "bg-gray-700 text-gray-300";
    }
}

function statusIcon(status: string) {
    switch (status) {
        case "A":
            return <FilePlus size={14} />;
        case "D":
            return <FileMinus size={14} />;
        case "R":
            return <FileEdit size={14} />;
        case "??":
            return <FileQuestion size={14} />;
        default:
            return <FileCode size={14} />;
    }
}

export default function FileRow({ file, selected, onClick }: FileRowProps) {
    const dir = file.path.substring(0, file.path.length - file.fileName.length);

    return (
        <div
            onClick={onClick}
            className={clsx(
                "flex items-center gap-2 px-2 py-1 cursor-pointer text-xs select-none",
                selected ? "bg-darcula-highlight" : "hover:bg-darcula-surface/50"
            )}
        >
            <span className="flex items-center text-darcula-muted">
                {statusIcon(file.status)}
            </span>
            <span
                className={clsx(
                    "px-1 py-0.5 rounded text-[10px] font-bold leading-none shrink-0",
                    statusBadgeClass(file.status)
                )}
            >
                {file.status}
            </span>
            <div className="flex-1 min-w-0 flex flex-col">
                <span className="truncate text-darcula-text font-medium">{file.fileName}</span>
                {dir && (
                    <span className="truncate text-darcula-muted text-[10px]">{dir}</span>
                )}
            </div>
        </div>
    );
}

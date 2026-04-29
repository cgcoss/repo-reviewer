import type { ChangedFile } from "../types";

interface DiffLineProps {
    line: string;
}

export default function DiffLine({ line }: DiffLineProps) {
    if (line.startsWith("+")) {
        return (
            <div className="flex bg-darcula-add text-darcula-addText font-mono text-xs leading-5">
                <span className="w-8 text-right pr-2 text-darcula-muted select-none shrink-0">+</span>
                <span className="whitespace-pre">{line.slice(1)}</span>
            </div>
        );
    }
    if (line.startsWith("-")) {
        return (
            <div className="flex bg-darcula-del text-darcula-delText font-mono text-xs leading-5">
                <span className="w-8 text-right pr-2 text-darcula-muted select-none shrink-0">-</span>
                <span className="whitespace-pre">{line.slice(1)}</span>
            </div>
        );
    }
    if (line.startsWith("@@")) {
        return (
            <div className="flex bg-darcula-highlight text-darcula-info font-mono text-xs leading-5">
                <span className="w-8 text-right pr-2 text-darcula-muted select-none shrink-0"></span>
                <span className="whitespace-pre">{line}</span>
            </div>
        );
    }
    if (line.startsWith("diff ") || line.startsWith("index ") || line.startsWith("--- ") || line.startsWith("+++ ")) {
        return (
            <div className="flex text-darcula-muted font-mono text-xs leading-5">
                <span className="w-8 text-right pr-2 text-darcula-muted select-none shrink-0"></span>
                <span className="whitespace-pre">{line}</span>
            </div>
        );
    }
    return (
        <div className="flex text-darcula-text font-mono text-xs leading-5">
            <span className="w-8 text-right pr-2 text-darcula-muted select-none shrink-0"></span>
            <span className="whitespace-pre">{line}</span>
        </div>
    );
}

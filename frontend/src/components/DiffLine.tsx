import type { SideBySideRow } from "../utils/diffParser";

interface DiffLineProps {
    row: SideBySideRow;
}

const numClass = "w-10 text-right pr-2 pl-1 text-darcula-muted select-none whitespace-nowrap";
const contentClass = "whitespace-pre px-1";

export default function DiffLine({ row }: DiffLineProps) {
    if (row.type === "header") {
        return (
            <tr className="bg-darcula-bg">
                <td colSpan={4} className={`bg-darcula-bg text-darcula-muted ${contentClass}`}>
                    {row.header}
                </td>
            </tr>
        );
    }

    if (row.type === "hunk") {
        return (
            <tr className="bg-darcula-highlight">
                <td colSpan={4} className={`bg-darcula-highlight text-darcula-info ${contentClass}`}>
                    {row.header}
                </td>
            </tr>
        );
    }

    const isMixed = row.type === "mixed";
    const isRemove = row.type === "remove";
    const isAdd = row.type === "add";

    const leftNumBg = isRemove || isMixed ? "bg-darcula-del" : "bg-darcula-bg";
    const leftTextBg = isRemove || isMixed ? "bg-darcula-del" : "bg-darcula-bg";
    const leftTextColor = isRemove || isMixed ? "text-darcula-delText" : "text-darcula-text";

    const rightNumBg = isAdd || isMixed ? "bg-darcula-add" : "bg-darcula-bg";
    const rightTextBg = isAdd || isMixed ? "bg-darcula-add" : "bg-darcula-bg";
    const rightTextColor = isAdd || isMixed ? "text-darcula-addText" : "text-darcula-text";

    return (
        <tr>
            <td className={`${numClass} ${leftNumBg}`}>{row.leftLineNumber ?? ""}</td>
            <td className={`${contentClass} ${leftTextBg} ${leftTextColor} border-r border-darcula-border`}>
                {row.leftContent ?? ""}
            </td>
            <td className={`${numClass} ${rightNumBg}`}>{row.rightLineNumber ?? ""}</td>
            <td className={`${contentClass} ${rightTextBg} ${rightTextColor}`}>
                {row.rightContent ?? ""}
            </td>
        </tr>
    );
}

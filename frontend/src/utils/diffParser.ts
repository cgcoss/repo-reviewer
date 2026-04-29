export type DiffRowType = 'header' | 'hunk' | 'context' | 'add' | 'remove' | 'mixed';

export interface SideBySideRow {
    type: DiffRowType;
    leftLineNumber?: number;
    rightLineNumber?: number;
    leftContent?: string;
    rightContent?: string;
    header?: string;
}

interface BufferedRemove {
    content: string;
    lineNum: number;
}

export function parseUnifiedDiff(diffText: string): SideBySideRow[] {
    const lines = diffText.split('\n');
    const rows: SideBySideRow[] = [];

    let leftLineNum = 0;
    let rightLineNum = 0;
    let removedBuffer: BufferedRemove[] = [];

    const flushRemovedBuffer = () => {
        for (const rem of removedBuffer) {
            rows.push({
                type: 'remove',
                leftLineNumber: rem.lineNum,
                leftContent: rem.content,
            });
        }
        removedBuffer = [];
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // File metadata / header lines
        if (
            line.startsWith('diff ') ||
            line.startsWith('index ') ||
            line.startsWith('--- ') ||
            line.startsWith('+++ ') ||
            line.startsWith('===') ||
            line.startsWith('Binary ') ||
            line.startsWith('old mode ') ||
            line.startsWith('new mode ') ||
            line.startsWith('deleted file mode ') ||
            line.startsWith('new file mode ') ||
            line.startsWith('similarity index ') ||
            line.startsWith('rename from ') ||
            line.startsWith('rename to ') ||
            line.startsWith('copy from ') ||
            line.startsWith('copy to ')
        ) {
            flushRemovedBuffer();
            rows.push({ type: 'header', header: line });
            continue;
        }

        // Hunk header
        const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (hunkMatch) {
            flushRemovedBuffer();
            leftLineNum = parseInt(hunkMatch[1], 10);
            rightLineNum = parseInt(hunkMatch[2], 10);
            rows.push({ type: 'hunk', header: line });
            continue;
        }

        // "No newline at end of file" marker
        if (line.startsWith('\\')) {
            flushRemovedBuffer();
            rows.push({ type: 'header', header: line });
            continue;
        }

        // Empty line – in a valid git diff this is rare outside hunks,
        // but treat it as context if we appear to be inside a hunk.
        if (line.length === 0) {
            const lastType = rows.length > 0 ? rows[rows.length - 1].type : null;
            if (
                lastType === 'hunk' ||
                lastType === 'context' ||
                lastType === 'add' ||
                lastType === 'remove' ||
                lastType === 'mixed'
            ) {
                flushRemovedBuffer();
                rows.push({
                    type: 'context',
                    leftLineNumber: leftLineNum,
                    rightLineNumber: rightLineNum,
                    leftContent: '',
                    rightContent: '',
                });
                leftLineNum++;
                rightLineNum++;
            } else {
                flushRemovedBuffer();
                rows.push({ type: 'header', header: line });
            }
            continue;
        }

        const prefix = line[0];
        const content = line.slice(1);

        if (prefix === ' ') {
            flushRemovedBuffer();
            rows.push({
                type: 'context',
                leftLineNumber: leftLineNum,
                rightLineNumber: rightLineNum,
                leftContent: content,
                rightContent: content,
            });
            leftLineNum++;
            rightLineNum++;
        } else if (prefix === '-') {
            removedBuffer.push({ content, lineNum: leftLineNum });
            leftLineNum++;
        } else if (prefix === '+') {
            if (removedBuffer.length > 0) {
                const rem = removedBuffer.shift()!;
                rows.push({
                    type: 'mixed',
                    leftLineNumber: rem.lineNum,
                    rightLineNumber: rightLineNum,
                    leftContent: rem.content,
                    rightContent: content,
                });
            } else {
                rows.push({
                    type: 'add',
                    rightLineNumber: rightLineNum,
                    rightContent: content,
                });
            }
            rightLineNum++;
        } else {
            // Unknown line – treat as header to avoid breaking numbering
            flushRemovedBuffer();
            rows.push({ type: 'header', header: line });
        }
    }

    flushRemovedBuffer();
    return rows;
}

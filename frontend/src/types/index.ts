export interface ChangedFile {
    id: string;
    path: string;
    oldPath?: string;
    fileName: string;
    status: string;
    staged: boolean;
    untracked: boolean;
}

export interface RepoSummary {
    path: string;
    branch: string;
}

export interface Commit {
    hash: string;
    shortHash: string;
    parentHashes: string[];
    message: string;
    authorName: string;
    authorEmail: string;
    timestamp: number;
}

export interface Ref {
    name: string;
    hash: string;
    type: string;
    isHead: boolean;
}

export interface HistoryResult {
    commits: Commit[];
    refs: Ref[];
}

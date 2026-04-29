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

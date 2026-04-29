export interface ChangedFile {
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

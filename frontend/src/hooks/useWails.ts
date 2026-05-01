import {
    OpenRepository,
    GetStatus,
    GetDiff,
    GetCurrentBranch,
    SelectDirectory,
    GetCommitHistory,
    GetCommitDiff,
} from "../../wailsjs/go/main/App";
import type { ChangedFile, RepoSummary, HistoryResult } from "../types";

export function useWails() {
    return {
        openRepository: (path: string): Promise<RepoSummary> => OpenRepository(path),
        getStatus: (path: string): Promise<ChangedFile[]> => GetStatus(path),
        getDiff: (path: string, file: ChangedFile): Promise<string> => GetDiff(path, file),
        getCurrentBranch: (path: string): Promise<string> => GetCurrentBranch(path),
        selectDirectory: (): Promise<string> => SelectDirectory(),
        getCommitHistory: (path: string, maxCount: number, skip: number): Promise<HistoryResult> =>
            GetCommitHistory(path, maxCount, skip),
        getCommitDiff: (path: string, hash: string): Promise<string> =>
            GetCommitDiff(path, hash),
    };
}

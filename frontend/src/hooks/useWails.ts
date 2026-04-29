import {
    OpenRepository,
    GetStatus,
    GetDiff,
    GetCurrentBranch,
    SelectDirectory,
} from "../../wailsjs/go/main/App";
import type { ChangedFile, RepoSummary } from "../types";

export function useWails() {
    return {
        openRepository: (path: string): Promise<RepoSummary> => OpenRepository(path),
        getStatus: (path: string): Promise<ChangedFile[]> => GetStatus(path),
        getDiff: (path: string, file: ChangedFile): Promise<string> => GetDiff(path, file),
        getCurrentBranch: (path: string): Promise<string> => GetCurrentBranch(path),
        selectDirectory: (): Promise<string> => SelectDirectory(),
    };
}

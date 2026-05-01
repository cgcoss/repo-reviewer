import type { Commit, Ref } from "../types";

export const LANE_COLORS = [
    "#3592C4", // blue
    "#6A8759", // green
    "#BC3F3C", // red
    "#B084D6", // purple
    "#D4A24E", // gold
    "#4DBFBF", // teal
    "#E077A0", // pink
    "#8C8C8C", // gray
];

export interface CommitLayout {
    hash: string;
    lane: number;
    lanesIn: number[];
    lanesOut: number[];
    isMerge: boolean;
    isFork: boolean;
}

export interface GraphLayout {
    commits: CommitLayout[];
    maxLane: number;
    refs: Ref[];
}

export function computeGraphLayout(commits: Commit[], refs: Ref[]): GraphLayout {
    const activeLanes = new Map<string, number>();
    let nextLane = 0;
    const layouts: CommitLayout[] = [];

    // Process oldest -> newest (reverse of git log output)
    for (let idx = commits.length - 1; idx >= 0; idx--) {
        const commit = commits[idx];

        let lane: number;
        if (activeLanes.has(commit.hash)) {
            lane = activeLanes.get(commit.hash)!;
        } else {
            lane = nextLane;
            nextLane++;
        }

        const lanesIn: number[] = [];
        for (const parentHash of commit.parentHashes) {
            if (activeLanes.has(parentHash)) {
                lanesIn.push(activeLanes.get(parentHash)!);
            } else {
                const used = new Set(activeLanes.values());
                let freeLane = 0;
                while (used.has(freeLane)) {
                    freeLane++;
                }
                if (freeLane >= nextLane) {
                    nextLane = freeLane + 1;
                }
                activeLanes.set(parentHash, freeLane);
                lanesIn.push(freeLane);
            }
        }

        const lanesOut = [lane];

        layouts.push({
            hash: commit.hash,
            lane,
            lanesIn,
            lanesOut,
            isMerge: commit.parentHashes.length > 1,
            isFork: false,
        });
    }

    // Reverse back to newest-first order
    layouts.reverse();

    // Compute fork status: a commit is a fork if multiple children point to it
    const childCount = new Map<string, number>();
    for (const commit of commits) {
        for (const parent of commit.parentHashes) {
            childCount.set(parent, (childCount.get(parent) || 0) + 1);
        }
    }
    for (const layout of layouts) {
        layout.isFork = (childCount.get(layout.hash) || 0) > 1;
    }

    return {
        commits: layouts,
        maxLane: nextLane > 0 ? nextLane - 1 : 0,
        refs,
    };
}

import type { GraphLayout } from "../utils/graphLayout";
import { LANE_COLORS } from "../utils/graphLayout";

interface CommitGraphProps {
    layout: GraphLayout;
    rowHeight: number;
}

export default function CommitGraph({ layout, rowHeight }: CommitGraphProps) {
    const { commits, maxLane } = layout;
    const svgWidth = (maxLane + 1) * 24 + 12;
    const svgHeight = commits.length * rowHeight;

    function laneX(lane: number): number {
        return lane * 24 + 12;
    }

    return (
        <svg
            width={svgWidth}
            height={svgHeight}
            className="shrink-0"
            style={{ minWidth: svgWidth }}
        >
            {commits.map((commit, i) => {
                const cy = i * rowHeight + rowHeight / 2;
                const cx = laneX(commit.lane);
                const color = LANE_COLORS[commit.branchColor % LANE_COLORS.length];
                const yNext = (i + 1) * rowHeight + rowHeight / 2;
                const h = rowHeight * 0.4;

                return (
                    <g key={commit.hash}>
                        {/* Lines for each lane transition (lanesIn -> lanesOut) */}
                        {commit.lanesIn.map((inLane, inIdx) =>
                            commit.lanesOut.map((outLane, outIdx) => {
                                const x1 = laneX(inLane);
                                const y1 = yNext;
                                const x2 = laneX(outLane);
                                const y2 = cy;
                                const path = `M ${x1},${y1} C ${x1},${y1 - h} ${x2},${y2 + h} ${x2},${y2}`;
                                const lineColor = LANE_COLORS[commit.lineColors[inIdx] % LANE_COLORS.length];
                                return (
                                    <path
                                        key={`${commit.hash}-line-${inIdx}-${outIdx}`}
                                        d={path}
                                        fill="none"
                                        stroke={lineColor}
                                        strokeWidth={2}
                                    />
                                );
                            })
                        )}

                        {/* Commit dot */}
                        <circle cx={cx} cy={cy} r={4} fill={color} />
                    </g>
                );
            })}
        </svg>
    );
}

export interface TerminalCandidate {
  createdAt: number;
  id: string;
  lastUserInputAt: number | null;
  status: "starting" | "running" | "disconnected" | "exited";
  updatedAt: number;
}

function recency(candidate: TerminalCandidate): readonly number[] {
  return [
    candidate.lastUserInputAt ?? candidate.updatedAt,
    candidate.updatedAt,
    candidate.createdAt,
  ];
}

function compareMostRecent(
  left: TerminalCandidate,
  right: TerminalCandidate,
): number {
  const leftRecency = recency(left);
  const rightRecency = recency(right);
  for (let index = 0; index < leftRecency.length; index += 1) {
    const difference = rightRecency[index]! - leftRecency[index]!;
    if (difference !== 0) return difference;
  }
  return left.id.localeCompare(right.id);
}

export function selectReusableTerminalId(
  candidates: readonly TerminalCandidate[],
  preferredTerminalId: string | null,
): string | null {
  if (preferredTerminalId !== null) {
    const preferred = candidates.find(
      (candidate) => candidate.id === preferredTerminalId,
    );
    if (preferred && preferred.status !== "exited") return preferred.id;
  }

  return (
    candidates
      .filter(
        (candidate) =>
          candidate.status === "starting" || candidate.status === "running",
      )
      .sort(compareMostRecent)[0]?.id ?? null
  );
}

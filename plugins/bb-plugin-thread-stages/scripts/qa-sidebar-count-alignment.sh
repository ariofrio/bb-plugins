#!/usr/bin/env bash
set -euo pipefail

qa_server_url="${1:-${BB_SERVER_URL:-}}"
if [[ -z "$qa_server_url" ]]; then
  echo "Pass the bb server URL or set BB_SERVER_URL." >&2
  exit 1
fi

qa_session="thread-stages-count-alignment-qa-$$"
cleanup() {
  agent-browser --session "$qa_session" close >/dev/null 2>&1 || true
}
trap cleanup EXIT

agent-browser --session "$qa_session" open "$qa_server_url" >/dev/null
agent-browser --session "$qa_session" wait --load networkidle >/dev/null
agent-browser --session "$qa_session" eval '(() => {
  const filterTrigger = document.querySelector("[data-thread-filter-trigger]");
  const filterRow = filterTrigger?.parentElement;
  const filterCount = [...(filterRow?.children ?? [])].find(
    (element) =>
      element instanceof HTMLElement &&
      element.hasAttribute("aria-label") &&
      element.classList.contains("bb-sidebar-hover-actions-fade"),
  );
  const stageCounts = [...document.querySelectorAll(
    "[data-sidebar-sticky-tier=\"label\"] [aria-label$=\"thread\"], [data-sidebar-sticky-tier=\"label\"] [aria-label$=\"threads\"]",
  )];
  if (!(filterCount instanceof HTMLElement)) {
    throw new Error(
      "Could not find a Projects and sections count. Enable one of its count modes before running this check.",
    );
  }
  if (stageCounts.length === 0) {
    throw new Error("Could not find any stage counts.");
  }

  const filterRect = filterCount.getBoundingClientRect();
  const filterCenter = filterRect.left + filterRect.width / 2;
  const results = stageCounts.map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      label: element.getAttribute("aria-label"),
      center: rect.left + rect.width / 2,
      width: rect.width,
    };
  });
  const misaligned = results.filter(
    ({ center }) => Math.abs(center - filterCenter) > 0.25,
  );
  if (misaligned.length > 0) {
    throw new Error(
      `Stage counts do not share the ${filterCenter}px indicator center: ${JSON.stringify(misaligned)}.`,
    );
  }
  return JSON.stringify({ filterCenter, stageCounts: results });
})()'

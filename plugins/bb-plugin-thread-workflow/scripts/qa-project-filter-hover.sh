#!/usr/bin/env bash
set -euo pipefail

qa_server_url="${1:-${BB_SERVER_URL:-}}"
if [[ -z "$qa_server_url" ]]; then
  echo "Pass the bb server URL or set BB_SERVER_URL." >&2
  exit 1
fi

qa_session="thread-workflow-project-filter-qa-$$"
cleanup() {
  agent-browser --session "$qa_session" close >/dev/null 2>&1 || true
}
trap cleanup EXIT

agent-browser --session "$qa_session" open "$qa_server_url" >/dev/null
agent-browser --session "$qa_session" wait 2000 >/dev/null
agent-browser --session "$qa_session" set viewport 900 700 >/dev/null
agent-browser --session "$qa_session" wait 300 >/dev/null
agent-browser --session "$qa_session" hover 'button[aria-label^="Filter by project"]' >/dev/null
agent-browser --session "$qa_session" eval '(() => {
  const control = document.querySelector("button[aria-label^=\"Filter by project\"]");
  const firstStage = document.querySelector("[data-sidebar-sticky-tier=\"label\"]");
  if (!(control instanceof HTMLElement) || !(firstStage instanceof HTMLElement)) {
    throw new Error("Could not find the project filter and first workflow stage.");
  }

  const controlRect = control.getBoundingClientRect();
  const stageRect = firstStage.getBoundingClientRect();
  const firstSection = firstStage.closest("section");
  if (
    !(firstSection instanceof HTMLElement) ||
    !(firstSection.nextElementSibling instanceof HTMLElement)
  ) {
    throw new Error("Could not find a second workflow stage for spacing comparison.");
  }

  const controlToFirstStage = stageRect.top - controlRect.bottom;
  const betweenStages = Number.parseFloat(getComputedStyle(firstSection).marginBottom);
  if (Math.abs(controlToFirstStage - betweenStages) > 0.25) {
    throw new Error(
      `Project filter gap is ${controlToFirstStage}px; stage gap is ${betweenStages}px.`,
    );
  }

  const shieldHeight = Number.parseFloat(
    getComputedStyle(firstStage, "::before").height,
  );
  const shieldTop = stageRect.top - shieldHeight;
  if (controlRect.bottom > shieldTop + 0.25) {
    throw new Error(
      `Sticky stage shield overlaps project filter by ${controlRect.bottom - shieldTop}px.`,
    );
  }

  const cursor = getComputedStyle(control).cursor;
  if (cursor !== "pointer") {
    throw new Error(`Expected pointer cursor, received ${cursor}.`);
  }

  return JSON.stringify({
    controlBottom: controlRect.bottom,
    controlToFirstStage,
    betweenStages,
    shieldTop,
    gap: shieldTop - controlRect.bottom,
    cursor,
  });
})()'

agent-browser --session "$qa_session" eval 'document.querySelector("[data-sidebar=\"content\"]").scrollTop = 120' >/dev/null
agent-browser --session "$qa_session" wait 200 >/dev/null
agent-browser --session "$qa_session" eval '(() => {
  const control = document.querySelector("button[aria-label^=\"Filter by project\"]");
  const stack = control?.closest("[data-sidebar-sticky-stack]");
  const scrollContent = control?.closest("[data-sidebar=\"content\"]");
  const firstStage = document.querySelector("[data-sidebar-sticky-tier=\"label\"]");
  const firstSection = firstStage?.closest("section");
  if (
    !(control instanceof HTMLElement) ||
    !(stack instanceof HTMLElement) ||
    !(scrollContent instanceof HTMLElement) ||
    !(firstStage instanceof HTMLElement) ||
    !(firstSection instanceof HTMLElement)
  ) {
    throw new Error("Could not find sticky workflow layout after scrolling.");
  }

  const controlRect = control.getBoundingClientRect();
  const contentRect = scrollContent.getBoundingClientRect();
  const expectedControlTop = contentRect.top + Number.parseFloat(getComputedStyle(stack).paddingTop);
  if (Math.abs(controlRect.top - expectedControlTop) > 0.25) {
    throw new Error(
      `Project filter scrolled to ${controlRect.top}px; sticky top is ${expectedControlTop}px.`,
    );
  }

  const stageRect = firstStage.getBoundingClientRect();
  const betweenStages = Number.parseFloat(getComputedStyle(firstSection).marginBottom);
  const expectedStageTop = controlRect.bottom + betweenStages;
  if (Math.abs(stageRect.top - expectedStageTop) > 0.25) {
    throw new Error(
      `Sticky stage top is ${stageRect.top}px; expected ${expectedStageTop}px below project filter.`,
    );
  }

  return JSON.stringify({
    scrollTop: scrollContent.scrollTop,
    controlTop: controlRect.top,
    stageTop: stageRect.top,
    betweenStages,
  });
})()'

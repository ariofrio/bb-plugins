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
  const tasksLabel = [...document.querySelectorAll("button span")].find(
    (node) => node.textContent?.trim() === "Tasks",
  );
  const tasksRow = tasksLabel?.closest("button");
  const firstStage = document.querySelector("[data-sidebar-sticky-tier=\"label\"]");
  if (
    !(control instanceof HTMLElement) ||
    !(tasksRow instanceof HTMLButtonElement) ||
    !(firstStage instanceof HTMLElement)
  ) {
    throw new Error("Could not find the project filter, Tasks row, and first workflow stage.");
  }

  const controlRect = control.getBoundingClientRect();
  const tasksRect = tasksRow.getBoundingClientRect();
  const stageRect = firstStage.getBoundingClientRect();
  const firstSection = firstStage.closest("section");
  if (
    !(firstSection instanceof HTMLElement) ||
    !(firstSection.nextElementSibling instanceof HTMLElement)
  ) {
    throw new Error("Could not find a second workflow stage for spacing comparison.");
  }

  const controlToFirstStage = stageRect.top - controlRect.bottom;
  if (Math.abs(controlRect.height - tasksRect.height) > 0.25) {
    throw new Error(
      `All threads is ${controlRect.height}px tall; the built-in Tasks row is ${tasksRect.height}px.`,
    );
  }
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
    controlHeight: controlRect.height,
    tasksHeight: tasksRect.height,
    controlToFirstStage,
    betweenStages,
    shieldTop,
    gap: shieldTop - controlRect.bottom,
    cursor,
  });
})()'

agent-browser --session "$qa_session" eval '(() => {
  const stage = document.querySelector("[data-sidebar-sticky-tier=\"label\"]");
  const section = stage?.closest("section");
  const labelId = section?.getAttribute("aria-labelledby");
  const label = labelId === null ? null : document.getElementById(labelId);
  const toggle = stage?.querySelector("button[aria-label$=\" section\"]");
  const count = stage?.querySelector(
    "[aria-label$=\"threads\"], [aria-label$=\"thread\"]",
  );
  if (
    !(stage instanceof HTMLElement) ||
    !(label instanceof HTMLElement) ||
    !(toggle instanceof HTMLButtonElement)
  ) {
    throw new Error("Could not find the first workflow stage label and collapse button.");
  }

  const labelRect = label.getBoundingClientRect();
  const toggleRect = toggle.getBoundingClientRect();
  const labelToToggle = toggleRect.left - labelRect.right;
  if (Math.abs(labelToToggle - 4) > 0.25) {
    throw new Error(
      `Stage toggle is ${labelToToggle}px after its label; expected the built-in 4px gap.`,
    );
  }

  const toggleStyle = getComputedStyle(toggle);
  const opacity = Number.parseFloat(toggleStyle.opacity);
  if (opacity !== 0 || toggleStyle.pointerEvents !== "none") {
    throw new Error(
      `Expanded stage toggle away from hover has opacity ${opacity} and pointer events ${toggleStyle.pointerEvents}; expected the built-in hidden state.`,
    );
  }
  if (
    Math.abs(toggleRect.width - 24) > 0.25 ||
    Math.abs(toggleRect.height - 24) > 0.25
  ) {
    throw new Error(
      `Stage toggle is ${toggleRect.width}x${toggleRect.height}px; expected the built-in 24x24px control.`,
    );
  }
  const icon = toggle.querySelector("svg");
  if (!(icon instanceof SVGElement)) {
    throw new Error("Could not find the workflow stage chevron icon.");
  }
  const iconRect = icon.getBoundingClientRect();
  if (
    Math.abs(iconRect.width - 12) > 0.25 ||
    Math.abs(iconRect.height - 12) > 0.25
  ) {
    throw new Error(
      `Stage chevron is ${iconRect.width}x${iconRect.height}px; expected the built-in 12x12px icon.`,
    );
  }

  if (
    count instanceof HTMLElement &&
    count.getBoundingClientRect().left <= toggleRect.right
  ) {
    throw new Error("Stage count is not positioned to the right of the collapse button.");
  }

  return JSON.stringify({
    labelToToggle,
    expandedAwayOpacity: opacity,
    expandedAwayPointerEvents: toggleStyle.pointerEvents,
    toggleSize: toggleRect.width,
    iconSize: iconRect.width,
    countIsRightAligned: count instanceof HTMLElement,
  });
})()'

agent-browser --session "$qa_session" hover \
  '[data-sidebar-sticky-tier="label"]' >/dev/null
agent-browser --session "$qa_session" wait 100 >/dev/null
agent-browser --session "$qa_session" eval '(() => {
  const toggle = document.querySelector(
    "[data-sidebar-sticky-tier=\"label\"] button[aria-label^=\"Collapse \"]",
  );
  if (!(toggle instanceof HTMLButtonElement)) {
    throw new Error("Could not find the expanded workflow stage toggle on hover.");
  }
  const style = getComputedStyle(toggle);
  const opacity = Number.parseFloat(style.opacity);
  if (opacity !== 1 || style.pointerEvents !== "auto") {
    throw new Error(
      `Expanded stage toggle on hover has opacity ${opacity} and pointer events ${style.pointerEvents}; expected the built-in revealed state.`,
    );
  }
  return JSON.stringify({
    expandedHoverOpacity: opacity,
    expandedHoverPointerEvents: style.pointerEvents,
  });
})()'

agent-browser --session "$qa_session" click \
  '[data-sidebar-sticky-tier="label"] button[aria-label^="Collapse "]' >/dev/null
agent-browser --session "$qa_session" hover 'button[aria-label^="Filter by project"]' >/dev/null
agent-browser --session "$qa_session" wait 100 >/dev/null
agent-browser --session "$qa_session" eval '(() => {
  const toggle = document.querySelector(
    "[data-sidebar-sticky-tier=\"label\"] button[aria-label^=\"Expand \"]",
  );
  if (!(toggle instanceof HTMLButtonElement)) {
    throw new Error("Stage did not collapse after a real pointer click.");
  }
  const opacity = Number.parseFloat(getComputedStyle(toggle).opacity);
  if (opacity !== 1) {
    throw new Error(
      `Collapsed stage toggle opacity is ${opacity}; expected 1 away from hover.`,
    );
  }
  return JSON.stringify({ collapsedToggleOpacity: opacity });
})()'
agent-browser --session "$qa_session" click \
  '[data-sidebar-sticky-tier="label"] button[aria-label^="Expand "]' >/dev/null
agent-browser --session "$qa_session" wait 100 >/dev/null

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

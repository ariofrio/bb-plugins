#!/usr/bin/env bash
set -euo pipefail

qa_server_url="${1:-${BB_SERVER_URL:-}}"
if [[ -z "$qa_server_url" ]]; then
  echo "Pass the bb server URL or set BB_SERVER_URL." >&2
  exit 1
fi

qa_session="thread-stages-indicator-alignment-qa-$$"
cleanup() {
  agent-browser --session "$qa_session" close >/dev/null 2>&1 || true
}
trap cleanup EXIT

agent-browser --session "$qa_session" open "$qa_server_url" >/dev/null
agent-browser --session "$qa_session" wait --load networkidle >/dev/null
agent-browser --session "$qa_session" eval '(() => {
  localStorage.removeItem("bb.plugin.thread-stages.threadFilter");
  localStorage.removeItem("bb.plugin.thread-stages.projectFilter");
  localStorage.removeItem("bb.plugin.thread-workflow.projectFilter");
})()' >/dev/null
agent-browser --session "$qa_session" open "$qa_server_url" >/dev/null
agent-browser --session "$qa_session" wait --load networkidle >/dev/null

if agent-browser --session "$qa_session" get count \
  'button[aria-label="Expand Working section"]' | grep -qx '1'; then
  agent-browser --session "$qa_session" click \
    'button[aria-label="Expand Working section"]' >/dev/null
fi

agent-browser --session "$qa_session" eval '(() => {
  const button = document.querySelector(
    "button[aria-label=\"Collapse Working section\"]",
  );
  const section = button?.closest("section");
  const indicator = section?.querySelector(
    "[data-sidebar-thread-trailing-indicator]",
  );
  if (!(indicator instanceof HTMLElement)) {
    throw new Error("Working has no visible thread indicator to compare.");
  }
  const rect = indicator.getBoundingClientRect();
  window.__threadStagesThreadIndicatorCenter = rect.left + rect.width / 2;
})()' >/dev/null

agent-browser --session "$qa_session" click \
  'button[aria-label="Collapse Working section"]' >/dev/null

agent-browser --session "$qa_session" eval '(() => {
  const button = document.querySelector(
    "button[aria-label=\"Expand Working section\"]",
  );
  const label = button?.closest("[data-sidebar-sticky-tier=\"label\"]");
  const indicator = label?.querySelector(
    "[data-sidebar-stage-trailing-indicator]",
  );
  const count = [...(label?.querySelectorAll("[aria-label]") ?? [])].find(
    (node) => /^\d+ threads?$/.test(node.getAttribute("aria-label") ?? ""),
  );
  if (!(indicator instanceof HTMLElement)) {
    throw new Error("Working has no collapsed stage indicator to compare.");
  }
  if (!(count instanceof HTMLElement)) {
    throw new Error("Working hides its count behind the collapsed stage indicator.");
  }
  const rect = indicator.getBoundingClientRect();
  const countRect = count.getBoundingClientRect();
  const stageCenter = rect.left + rect.width / 2;
  const countCenter = countRect.left + countRect.width / 2;
  const threadCenter = window.__threadStagesThreadIndicatorCenter;
  if (
    typeof threadCenter !== "number" ||
    Math.abs(stageCenter - threadCenter) > 0.25
  ) {
    throw new Error(
      `Stage indicator center ${stageCenter}px does not match thread indicator center ${threadCenter}px.`,
    );
  }
  if (Math.abs(countCenter - (stageCenter - rect.width)) > 0.25) {
    throw new Error(
      `Stage count center ${countCenter}px is not one indicator slot left of ${stageCenter}px.`,
    );
  }
  return JSON.stringify({
    countCenter,
    countWidth: countRect.width,
    stageCenter,
    threadCenter,
    width: rect.width,
  });
})()'

#!/usr/bin/env bash
set -euo pipefail

qa_server_url="${1:-${BB_SERVER_URL:-}}"
if [[ -z "$qa_server_url" ]]; then
  echo "Pass the bb server URL or set BB_SERVER_URL." >&2
  exit 1
fi

qa_bb="${BB_CLI:-bb}"
qa_session="thread-stages-row-height-qa-$$"
qa_original_preview="$({
  BB_SERVER_URL="$qa_server_url" "$qa_bb" plugin config thread-stages --json
} | node -e '
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { input += chunk; });
  process.stdin.on("end", () => {
    process.stdout.write(String(JSON.parse(input).values.showThreadPreviews));
  });
')"

cleanup() {
  if [[ "$qa_original_preview" == "true" || "$qa_original_preview" == "false" ]]; then
    BB_SERVER_URL="$qa_server_url" "$qa_bb" plugin config thread-stages set \
      showThreadPreviews "$qa_original_preview" >/dev/null 2>&1 || true
  fi
  agent-browser --session "$qa_session" close >/dev/null 2>&1 || true
}
trap cleanup EXIT

BB_SERVER_URL="$qa_server_url" "$qa_bb" plugin config thread-stages set \
  showThreadPreviews false >/dev/null
agent-browser --session "$qa_session" open "$qa_server_url" >/dev/null
agent-browser --session "$qa_session" set viewport 900 700 2 >/dev/null
agent-browser --session "$qa_session" wait \
  '[data-bb-plugin-root] [data-sidebar-thread-shortcut-target]' >/dev/null

agent-browser --session "$qa_session" eval '(() => {
  const link = document.querySelector("[data-bb-plugin-root] [data-sidebar-thread-shortcut-target]");
  const row = link?.parentElement;
  const copy = link?.nextElementSibling?.querySelector("span[title]")?.parentElement;
  if (!(row instanceof HTMLElement) || !(copy instanceof HTMLElement)) {
    throw new Error("Could not find a rendered Thread stages row and its copy.");
  }
  if (copy.children.length !== 1) {
    throw new Error("The preview-disabled row still renders preview copy.");
  }
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;height:var(--bb-sidebar-row-height);visibility:hidden";
  document.body.append(probe);
  const builtInHeight = probe.getBoundingClientRect().height;
  probe.remove();
  const style = getComputedStyle(row);
  const paddingTop = Number.parseFloat(style.paddingTop);
  const paddingBottom = Number.parseFloat(style.paddingBottom);
  const rowHeight = row.getBoundingClientRect().height;
  const copyHeight = copy.getBoundingClientRect().height;
  const expectedHeight = copyHeight + paddingTop + paddingBottom;
  if (
    Math.abs(paddingTop - paddingBottom) > 0.25 ||
    Math.abs(rowHeight - expectedHeight) > 0.25 ||
    Math.abs(rowHeight - builtInHeight) > 0.25
  ) {
    throw new Error(`Preview-disabled geometry is not native-height and content-driven: ${JSON.stringify({
      builtInHeight,
      copyHeight,
      expectedHeight,
      paddingBottom,
      paddingTop,
      rowHeight,
    })}`);
  }
  localStorage.setItem("__threadStagesRowHeightQa", JSON.stringify({
    paddingBottom,
    paddingTop,
    rowHeight,
  }));
  return JSON.stringify({
    previewHidden: { builtInHeight, paddingBottom, paddingTop, rowHeight },
  });
})()'

BB_SERVER_URL="$qa_server_url" "$qa_bb" plugin config thread-stages set \
  showThreadPreviews true >/dev/null
agent-browser --session "$qa_session" open "$qa_server_url" >/dev/null
agent-browser --session "$qa_session" wait --text \
  'Dashboard polish is in place.' >/dev/null

agent-browser --session "$qa_session" eval '(() => {
  const link = document.querySelector("[data-bb-plugin-root] [data-sidebar-thread-shortcut-target]");
  const row = link?.parentElement;
  const copy = link?.nextElementSibling?.querySelector("span[title]")?.parentElement;
  const hidden = JSON.parse(localStorage.getItem("__threadStagesRowHeightQa") ?? "null");
  localStorage.removeItem("__threadStagesRowHeightQa");
  if (
    !(row instanceof HTMLElement) ||
    !(copy instanceof HTMLElement) ||
    copy.children.length !== 2 ||
    hidden === null
  ) {
    throw new Error("Could not compare the preview-visible Thread stages row.");
  }
  const style = getComputedStyle(row);
  const paddingTop = Number.parseFloat(style.paddingTop);
  const paddingBottom = Number.parseFloat(style.paddingBottom);
  const rowHeight = row.getBoundingClientRect().height;
  const copyHeight = copy.getBoundingClientRect().height;
  const expectedHeight = copyHeight + paddingTop + paddingBottom;
  if (
    Math.abs(paddingTop - paddingBottom) > 0.25 ||
    Math.abs(paddingTop - hidden.paddingTop) > 0.25 ||
    Math.abs(paddingBottom - hidden.paddingBottom) > 0.25 ||
    Math.abs(rowHeight - expectedHeight) > 0.25 ||
    rowHeight <= hidden.rowHeight
  ) {
    throw new Error(`Preview-visible geometry does not grow from the same padding: ${JSON.stringify({
      copyHeight,
      expectedHeight,
      hidden,
      paddingBottom,
      paddingTop,
      rowHeight,
    })}`);
  }
  return JSON.stringify({
    previewShown: { copyHeight, paddingBottom, paddingTop, rowHeight },
  });
})()'

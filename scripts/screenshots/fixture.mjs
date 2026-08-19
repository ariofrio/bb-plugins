// The one state every screenshot is taken from: three projects, a handful of
// threads spread across the stages, and the icons and stage assignments the
// plugins add. Keeping every capture on this fixture is what makes shots of
// the same area comparable.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const PROJECTS = [
  { name: "Atlas", icon: "satellite-03", color: "blue" },
  { name: "Relay", icon: "share-08", color: "teal" },
  { name: "Orbit", icon: "orbit-01", color: "purple" },
];

// Stage names match the Thread stages plugin's CLI vocabulary.
export const THREADS = [
  {
    project: "Atlas",
    title: "Polish analytics dashboard",
    stage: "Done",
    prompt:
      "Polish the analytics dashboard. Improve the metric cards, add keyboard navigation, and verify the loading state.",
    children: [{ title: "Audit keyboard navigation", prompt: "Audit keyboard navigation across the dashboard." }],
  },
  {
    project: "Atlas",
    title: "Add loading-state tests",
    stage: "To do",
    prompt: "Add tests for the dashboard's loading states.",
  },
  {
    project: "Relay",
    title: "Investigate webhook retries",
    // Its turn never ends, which is how the fixture keeps one thread running
    // and one stage occupied by a thread bb placed there itself.
    stage: null,
    prompt: "Investigate why webhook retries stall after the third attempt.",
  },
  {
    project: "Relay",
    title: "Harden events API",
    stage: "Blocked",
    prompt: "Harden the events API against duplicate deliveries.",
  },
  {
    project: "Orbit",
    title: "Draft release notes",
    stage: "To do",
    prompt: "Draft the release notes for this milestone.",
  },
  {
    project: "Orbit",
    title: "Sketch onboarding tour",
    stage: "Backlog",
    prompt: "Sketch an onboarding tour for first-run users.",
  },
];

/** Asked in the side chat the keyboard-shortcut screenshot opens. */
export const SIDE_CHAT_QUESTION = "What did the dashboard pass end up covering?";

export const TRANSCRIPTS = [
  {
    prompt: THREADS[0].prompt,
    updates: [
      chunk(
        "Dashboard polish is in place.\n\n- Refined metric formatting and loading states\n- Added keyboard-focus coverage\n- Verified all 18 dashboard tests pass",
      ),
    ],
  },
  {
    prompt: THREADS[0].children[0].prompt,
    updates: [
      chunk(
        "Every dashboard control is reachable by keyboard, and focus order follows the visual order.",
      ),
    ],
  },
  {
    prompt: THREADS[1].prompt,
    updates: [chunk("Added three tests covering the empty, partial, and error loading states.")],
  },
  {
    prompt: THREADS[2].prompt,
    // Left unanswered on purpose: this is the thread bb shows as Working.
    hang: true,
    updates: [
      chunk(
        "Reproducing the stalled retry against the events fixture, then tracing the backoff timer.",
      ),
    ],
  },
  {
    prompt: THREADS[3].prompt,
    updates: [chunk("Deliveries are now idempotent per event id, and replays are safe.")],
  },
  {
    prompt: THREADS[4].prompt,
    updates: [chunk("Release notes drafted, grouped by feature, fix, and breaking change.")],
  },
  {
    prompt: THREADS[5].prompt,
    updates: [chunk("Sketched a four-step tour that introduces projects, threads, and environments.")],
  },
  {
    prompt: SIDE_CHAT_QUESTION,
    updates: [
      chunk(
        "The metric cards, the focus order, and the loading states. Eighteen dashboard tests cover them.",
      ),
    ],
  },
  {
    // bb tells a parent thread when its child finishes, which starts one more
    // turn; without a reply for it the parent would end on a stray "Done."
    prompt: "[bb system]*",
    updates: [
      chunk("Keyboard navigation checks out too, so the dashboard work is complete."),
    ],
  },
  { prompt: "*", updates: [chunk("Done.")] },
];

function chunk(text) {
  return {
    sessionUpdate: "agent_message_chunk",
    content: { type: "text", text },
  };
}

/** The scripted agent stands in for a real one; see agent.mjs. */
export const AGENT = {
  id: "screenshots",
  displayName: "bb",
  modelId: "fixture",
  modelName: "Demo",
};

export function writeManagedConfig({ dataDir, harnessDir }) {
  const transcriptsPath = join(dataDir, "transcripts.json");
  writeFileSync(transcriptsPath, JSON.stringify(TRANSCRIPTS, null, 2));
  writeFileSync(
    join(dataDir, "config.json"),
    `${JSON.stringify(
      {
        customAcpAgents: [
          {
            id: AGENT.id,
            displayName: AGENT.displayName,
            command: process.execPath,
            args: [join(harnessDir, "agent.mjs")],
            env: {
              BB_SCREENSHOT_TRANSCRIPTS: transcriptsPath,
              BB_SCREENSHOT_MODEL_ID: AGENT.modelId,
              BB_SCREENSHOT_MODEL_NAME: AGENT.modelName,
            },
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
}

export function seed({ stack, workspaceRoot, bb }) {
  const run = (args) =>
    execFileSync(bb, [...args], { env: stack.env, encoding: "utf8" });
  const runJson = (args) => JSON.parse(run([...args, "--json"]));

  run(["settings", "reload"]);

  // Each run rebuilds the workspaces so a repeat run commits the same history.
  rmSync(workspaceRoot, { recursive: true, force: true });

  const projects = new Map();
  for (const project of PROJECTS) {
    const root = join(workspaceRoot, project.name.toLowerCase());
    mkdirSync(root, { recursive: true });
    execFileSync("git", ["init", "--quiet", "--initial-branch=main"], { cwd: root });
    writeFileSync(join(root, "README.md"), `# ${project.name}\n`);
    execFileSync("git", ["add", "."], { cwd: root });
    execFileSync("git", ["commit", "--quiet", "-m", "Initial commit"], {
      cwd: root,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "bb",
        GIT_AUTHOR_EMAIL: "bb@example.com",
        GIT_COMMITTER_NAME: "bb",
        GIT_COMMITTER_EMAIL: "bb@example.com",
      },
    });
    const created = runJson([
      "project",
      "create",
      "--name",
      project.name,
      "--root",
      root,
      "--machine",
      "screenshots",
    ]);
    projects.set(project.name, { ...created, root, spec: project });
  }

  const threads = new Map();
  const spawn = (spec, project, parentThreadId) => {
    const created = runJson([
      "thread",
      "spawn",
      "--project",
      project.id,
      "--machine",
      "screenshots",
      "--environment",
      project.root,
      "--provider",
      `acp-${AGENT.id}`,
      "--model",
      AGENT.modelId,
      "--title",
      spec.title,
      // The scripted agent declares no approval surface, so bb allows only the
      // two modes that never ask.
      "--permission-mode",
      "accept-edits",
      "--prompt",
      spec.prompt,
      ...(parentThreadId ? ["--parent-thread", parentThreadId] : []),
    ]);
    threads.set(spec.title, created);
    return created;
  };

  for (const spec of THREADS) {
    const project = projects.get(spec.project);
    const thread = spawn(spec, project);
    for (const child of spec.children ?? []) spawn(child, project, thread.id);
  }

  // Thread stages moves a thread itself while its turn runs, so hand-set
  // stages only stick once every answered thread has settled.
  for (const spec of THREADS) {
    if (spec.stage === null) continue;
    run(["thread", "wait", threads.get(spec.title).id, "--status", "idle"]);
    for (const child of spec.children ?? []) {
      run(["thread", "wait", threads.get(child.title).id, "--status", "idle"]);
    }
  }
  for (const spec of THREADS) {
    if (spec.stage === null) continue;
    run(["thread-stages", "update", threads.get(spec.title).id, "--stage", spec.stage]);
  }

  return { projects, threads, run, runJson };
}

export async function applyPluginState({ stack, projects }) {
  for (const [name, project] of projects) {
    const { icon, color } = project.spec;
    const response = await fetch(
      new URL(
        `/api/v1/plugins/project-icons/rpc/setProjectIcon`,
        stack.serverUrl,
      ),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: project.id, icon, color }),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Could not set the ${name} project icon: ${response.status} ${await response.text()}`,
      );
    }
  }
}

// The one state every screenshot is taken from: three projects, a handful of
// threads spread across the stages, and the icons and stage assignments the
// plugins add. Keeping every capture on this fixture is what makes shots of
// the same area comparable.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Three projects a reader can place at a glance, each with the icon its own
 * work suggests rather than a color on the default folder.
 */
export const PROJECTS = [
  { name: "Storefront", icon: "store-01", color: "blue" },
  { name: "Payments API", icon: "api", color: "teal" },
  { name: "Docs site", icon: "book-open-01", color: "purple" },
];

/** bb's own project for threads that belong to no repository. */
export const PERSONAL_PROJECT_ID = "proj_personal";

// Stage names match the Thread stages plugin's CLI vocabulary. One thread per
// stage is what keeps a card's worth of sidebar legible: every stage shows what
// it holds without any of them needing to be scrolled past.
export const THREADS = [
  {
    project: "Storefront",
    title: "Polish analytics dashboard",
    // The thread the shots open, in the stage a thread sits in most of the
    // time: bb returns a thread to To do the moment its turn ends.
    stage: "To do",
    prompt:
      "Polish the analytics dashboard. Improve the metric cards, add keyboard navigation, and verify the loading state.",
    reply:
      "Dashboard polish is in place.\n\n- Refined metric formatting and loading states\n- Added keyboard-focus coverage\n- Verified all 18 dashboard tests pass",
    children: [
      {
        title: "Audit keyboard navigation",
        prompt: "Audit keyboard navigation across the dashboard.",
        reply:
          "Every dashboard control is reachable by keyboard, and focus order follows the visual order.",
      },
    ],
  },
  {
    project: "Payments API",
    title: "Investigate webhook retries",
    // Its turn never ends, which is how the fixture keeps one thread running
    // and one stage occupied by a thread bb placed there itself.
    stage: null,
    hang: true,
    prompt: "Investigate why webhook retries stall after the third attempt.",
    reply:
      "Reproducing the stalled retry against the events fixture, then tracing the backoff timer.",
  },
  {
    project: "Payments API",
    title: "Harden events API",
    stage: "Blocked",
    prompt: "Harden the events API against duplicate deliveries.",
    reply: "Deliveries are now idempotent per event id, and replays are safe.",
  },
  {
    project: "Docs site",
    title: "Draft release notes",
    stage: "Done",
    prompt: "Draft the release notes for this milestone.",
    reply: "Release notes drafted, grouped by feature, fix, and breaking change.",
  },
  {
    project: "Docs site",
    title: "Sketch onboarding tour",
    stage: "Canceled",
    prompt: "Sketch an onboarding tour for first-run users.",
    reply:
      "Sketched a four-step tour, though it assumes the sign-up flow that is being replaced.",
  },
  {
    // Not every thread belongs to a repository; this one is bb's personal
    // project, which the sidebar and the icons both treat differently.
    project: null,
    title: "Compare managed Postgres plans",
    stage: "Backlog",
    prompt: "Compare managed Postgres plans for a small production app.",
    reply:
      "For this size, the shared tiers on Neon and Supabase both cover it, and Neon's branching is the one that pays off during migrations.",
  },
];

/** Asked in the side chat the keyboard-shortcut screenshot opens. */
export const SIDE_CHAT_QUESTION = "What did the dashboard pass end up covering?";

/** Every thread answers from its own entry, plus the turns bb starts itself. */
export const TRANSCRIPTS = [
  ...THREADS.flatMap((thread) => [thread, ...(thread.children ?? [])]).map(
    ({ prompt, reply, hang }) => ({
      prompt,
      ...(hang ? { hang } : {}),
      updates: [chunk(reply)],
    }),
  ),
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
    const root = join(workspaceRoot, project.name.toLowerCase().replace(/ /gu, "-"));
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
      // A personal thread has no repository to run in; bb provisions its
      // workspace itself, so it names neither a machine nor an environment.
      project?.id ?? PERSONAL_PROJECT_ID,
      ...(project
        ? ["--machine", "screenshots", "--environment", project.root]
        : []),
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

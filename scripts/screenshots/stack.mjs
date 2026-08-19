// Boots a throwaway bb — its own data directory, server, and host daemon — so
// screenshots never touch the bb the developer is using and always start from
// the same empty state.
//
// The app binary ships both halves, so this reuses them rather than depending
// on a published package: the server serves the web client only when NODE_ENV
// is production, and the daemon enrolls through the loopback-only
// /internal/hosts/enroll-key route the desktop app uses on first run.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, join } from "node:path";

const MACOS_APP_RESOURCES =
  "/Applications/bb.app/Contents/Resources/app.asar.unpacked/node_modules/bb-app";
const MACOS_ELECTRON = "/Applications/bb.app/Contents/MacOS/bb";

function resolveAppPaths() {
  if (!existsSync(MACOS_APP_RESOURCES)) {
    throw new Error(
      `bb's app resources are not at ${MACOS_APP_RESOURCES}. Screenshots need the desktop app installed.`,
    );
  }
  return {
    appDir: MACOS_APP_RESOURCES,
    // Electron's bundled node runs both halves, so the harness needs no node
    // of its own that matches the app's runtime.
    node: MACOS_ELECTRON,
    serverEntry: join(MACOS_APP_RESOURCES, "server/dist/index.js"),
    daemonEntry: join(MACOS_APP_RESOURCES, "host-daemon/dist/daemon-bundle.mjs"),
    cliDir: join(MACOS_APP_RESOURCES, "host-daemon/dist"),
  };
}

async function freePort() {
  return await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function waitFor(check, { timeoutMs = 60000, label }) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await check()) return;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

/**
 * An interrupted run leaves its server and daemon behind, and the daemon holds
 * a lock the next run needs, so a run always ends the previous one first.
 */
function stopPreviousRun(pidPath) {
  if (!existsSync(pidPath)) return;
  for (const pid of JSON.parse(readFileSync(pidPath, "utf8"))) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Already gone, which is the state we wanted.
    }
  }
}

export async function startStack({ dataDir, logStream }) {
  const paths = resolveAppPaths();
  const pidPath = join(dirname(dataDir), "stack-pids.json");
  stopPreviousRun(pidPath);
  await rm(dataDir, { recursive: true, force: true });
  await mkdir(dataDir, { recursive: true });

  const serverPort = await freePort();
  const hostDaemonPort = await freePort();
  const serverUrl = `http://127.0.0.1:${serverPort}`;
  const children = [];

  function launch(entry, env) {
    const child = spawn(paths.node, [entry], {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        // The server only mounts the web client's static bundle in production.
        NODE_ENV: "production",
        BB_DATA_DIR: dataDir,
        BB_TELEMETRY: "false",
        ...env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.pipe(logStream, { end: false });
    child.stderr.pipe(logStream, { end: false });
    children.push(child);
    writeFileSync(pidPath, JSON.stringify(children.map((each) => each.pid)));
    return child;
  }

  launch(paths.serverEntry, {
    BB_SERVER_PORT: String(serverPort),
    BB_SERVER_BIND_HOST: "127.0.0.1",
  });
  await waitFor(
    async () => {
      try {
        return (await fetch(serverUrl)).ok;
      } catch {
        return false;
      }
    },
    { label: "the bb server to listen" },
  );

  // The daemon needs bootstrap material; the server mints it for loopback
  // callers, the same path the desktop app takes when it first runs.
  const enrollment = await fetch(
    new URL("/internal/hosts/enroll-key", serverUrl),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    },
  ).then((response) => response.json());

  launch(paths.daemonEntry, {
    BB_SERVER_URL: serverUrl,
    BB_HOST_DAEMON_PORT: String(hostDaemonPort),
    BB_HOST_NAME: "screenshots",
    BB_HOST_TYPE: "persistent",
    BB_HOST_ID: enrollment.hostId,
    BB_HOST_ENROLL_KEY: enrollment.enrollKey,
    BB_CLI_DIR: paths.cliDir,
  });

  const env = {
    ...process.env,
    BB_DATA_DIR: dataDir,
    BB_SERVER_URL: serverUrl,
    BB_PROJECT_ID: undefined,
    BB_THREAD_ID: undefined,
    BB_ENVIRONMENT_ID: undefined,
  };

  await waitFor(
    async () => {
      const response = await fetch(new URL("/api/v1/hosts", serverUrl)).catch(
        () => null,
      );
      if (!response?.ok) return false;
      const body = await response.json();
      const hosts = Array.isArray(body) ? body : (body.hosts ?? []);
      return hosts.some((host) => host.status === "connected");
    },
    { label: "the host daemon to connect" },
  );

  return {
    serverUrl,
    dataDir,
    env,
    async stop() {
      for (const child of children) child.kill("SIGTERM");
      await Promise.all(
        children.map(
          (child) =>
            new Promise((resolve) => {
              if (child.exitCode !== null) resolve();
              child.on("exit", resolve);
              setTimeout(() => {
                child.kill("SIGKILL");
                resolve();
              }, 5000);
            }),
        ),
      );
    },
  };
}

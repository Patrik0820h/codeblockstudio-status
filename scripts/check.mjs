// Runs on a schedule via .github/workflows/check.yml, on GitHub's own
// infrastructure — deliberately independent of whatever this checks, so
// a full outage of the monitored site can never also take the status
// page itself down with it.
//
// The "api" service is checked for exactly HTTP 200, not just "did it
// respond" — codeblockstudio.hu/api/health deliberately returns 503 when
// its database is unreachable, so a plain reachability check would miss
// exactly the failure mode it exists to catch.

import { readFile, writeFile } from "node:fs/promises";

const DATA_PATH = new URL("../data/history.json", import.meta.url);
const TIMEOUT_MS = 10_000;
const RETENTION_DAYS = 90;
const RETENTION_SECONDS = RETENTION_DAYS * 24 * 60 * 60;

async function checkUrl(url, requireExactly200) {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "codeblockstudio-status-check" },
    });
    const ms = Date.now() - start;
    const up = requireExactly200 ? response.status === 200 : response.status < 400;
    return { up, ms };
  } catch {
    return { up: false, ms: Date.now() - start };
  }
}

async function main() {
  const raw = await readFile(DATA_PATH, "utf8");
  const data = JSON.parse(raw);

  const nowSeconds = Math.floor(Date.now() / 1000);
  const cutoff = nowSeconds - RETENTION_SECONDS;

  for (const service of data.services) {
    const requireExactly200 = service.id === "api";
    const result = await checkUrl(service.url, requireExactly200);

    const history = data.checks[service.id] ?? [];
    history.push({ t: nowSeconds, up: result.up, ms: result.ms });

    // Prune anything older than the retention window so the file
    // doesn't grow forever.
    data.checks[service.id] = history.filter((entry) => entry.t >= cutoff);

    console.log(`${service.id}: ${result.up ? "up" : "DOWN"} (${result.ms}ms)`);
  }

  await writeFile(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

main().catch((error) => {
  console.error("Status check failed unexpectedly:", error);
  process.exit(1);
});

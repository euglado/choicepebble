import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";

for (const entry of ["main", "register"]) {
  test(`${entry} fails safely without configuration and without connecting`, () => {
    const result = spawnSync(process.execPath, [`dist/src/${entry}.js`], {
      env: { ...process.env, DISCORD_TOKEN: "", DISCORD_APPLICATION_ID: "", DISCORD_GUILD_ID: "" },
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /npm run setup/);
    assert.equal(result.stdout, "");
  });
}
test("noninteractive setup refuses input without creating a credential file", () => {
  const directory = mkdtempSync(join(tmpdir(), "choicepebble-test-"));
  try {
    const result = spawnSync(process.execPath, [resolve("scripts/setup.mjs")], {
      cwd: directory,
      encoding: "utf8",
      timeout: 10_000,
      input: "example-not-a-token\n",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /interactive terminal/);
    assert(!result.stderr.includes("example-not-a-token"));
    assert(!existsSync(join(directory, ".env")));
  } finally {
    // Only delete this test's newly created absolute temporary directory.
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert(basename(directory).startsWith("choicepebble-test-"));
    rmSync(directory, { recursive: true });
  }
});

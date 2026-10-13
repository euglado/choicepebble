import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const allowed = new Set(["MIT", "Apache-2.0", "MIT OR Apache-2.0", "0BSD", "BSD-3-Clause", "ISC"]);
let packages = 0;
for (const [name, entry] of Object.entries(lock.packages)) {
  assert(allowed.has(entry.license), `Review dependency license: ${name || "."}`);
  if (!name) continue;
  assert(
    /^https:\/\/registry\.npmjs\.org\//.test(entry.resolved),
    `Non-registry dependency: ${name}`,
  );
  assert(
    /^sha512-[A-Za-z0-9+/]+={0,2}$/.test(entry.integrity),
    `Missing SHA-512 integrity: ${name}`,
  );
  assert(!entry.hasInstallScript, `Review install script: ${name}`);
  packages++;
}
// These are limited source-pattern checks, not a guarantee that arbitrary secrets are absent.
const patterns = [
  new RegExp("mfa" + "\\.[A-Za-z0-9_-]{70,}"),
  /[A-Za-z0-9_-]{23,28}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{25,}/,
  new RegExp("gh[pousr]" + "_[A-Za-z0-9]{30,}"),
  new RegExp("-----BEGIN " + "(?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
  /DISCORD_TOKEN\s*=\s*[A-Za-z0-9._-]{30,}/,
];
let files = 0;
function scan(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist", "coverage"].includes(item.name)) continue;
    const path = join(directory, item.name);
    if (item.name.startsWith(".env") && item.name !== ".env.example") continue;
    if (item.isDirectory()) scan(path);
    else if (item.isFile()) {
      const content = readFileSync(path, "utf8");
      assert(
        !patterns.some((pattern) => pattern.test(content)),
        `Credential-like content in ${relative(".", path)}; value suppressed`,
      );
      files++;
    } else throw new Error(`Unexpected symlink: ${path}`);
  }
}
scan(".");
console.log(
  `Checked ${packages} dependency licenses, registry origins and SHA-512 entries; scanned ${files} source files for credential patterns.`,
);

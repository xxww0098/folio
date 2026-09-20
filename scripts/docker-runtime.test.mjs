import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function uncommented(source) {
  return source
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
}

function stageFrom(dockerfile, name) {
  const stages = [
    ...dockerfile.matchAll(/^FROM(?:\s+--platform=\S+)?\s+(\S+)(?:\s+AS\s+(\S+))?/gm),
  ];
  return stages.find((match) => match[2] === name)?.[1] ?? null;
}

test("docker stages are Node, never Bun", () => {
  const docker = readFileSync(join(root, "Dockerfile"), "utf8");
  const code = uncommented(docker);
  assert.doesNotMatch(code, /oven\/bun|\bbun\.lock\b|\bbun\s+/);
  assert.match(code, /package-lock\.json/);
  for (const name of ["deps", "build", "prod-deps", "runner"]) {
    const image = stageFrom(docker, name);
    assert.ok(image, `Dockerfile has a ${name} stage`);
    assert.match(image, /^node:/, `${name} must be a node image, got ${image}`);
  }
});

test("entrypoint starts srvx with node and never calls bun", () => {
  const sh = uncommented(readFileSync(join(root, "docker-entrypoint.sh"), "utf8"));
  assert.match(sh, /\bnode\s+scripts\/migrate\.mjs\b/);
  assert.match(sh, /\bnode\s+scripts\/ensure-init\.mjs\b/);
  assert.match(sh, /\bexec\s+node\s+\.\/node_modules\/srvx\/bin\/srvx\.mjs\b/);
  assert.doesNotMatch(sh, /\bbun\b/);
  assert.doesNotMatch(sh, /node_modules\/\.bin\/srvx/);
});

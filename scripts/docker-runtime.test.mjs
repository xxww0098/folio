import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function stageFrom(dockerfile, name) {
  const stages = [...dockerfile.matchAll(/^FROM\s+(\S+)(?:\s+AS\s+(\S+))?/gm)];
  return stages.find((match) => match[2] === name)?.[1] ?? null;
}

test("docker runner is Node, not Bun", () => {
  const docker = readFileSync(join(root, "Dockerfile"), "utf8");
  const runner = stageFrom(docker, "runner");
  assert.ok(runner, "Dockerfile has a runner stage");
  assert.match(runner, /^node:/, `runner must be a node image, got ${runner}`);
  assert.doesNotMatch(runner, /bun/i);
});

test("entrypoint starts srvx with node and never calls bun", () => {
  const sh = readFileSync(join(root, "docker-entrypoint.sh"), "utf8");
  const code = sh
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
  assert.match(code, /\bnode\s+scripts\/migrate\.mjs\b/);
  assert.match(code, /\bnode\s+scripts\/ensure-init\.mjs\b/);
  assert.match(code, /\bexec\s+node\s+\.\/node_modules\/srvx\/bin\/srvx\.mjs\b/);
  assert.doesNotMatch(code, /\bbun\b/);
  assert.doesNotMatch(code, /node_modules\/\.bin\/srvx/);
});


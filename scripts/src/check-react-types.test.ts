import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkWorkspacePins,
  checkManifestPins,
  checkLockfile,
  checkInstalledCopies,
  findWorkspaceManifests,
  yamlSectionPins,
  runChecks,
} from "./check-react-types.ts";

const goodYaml = `packages:
  - artifacts/*

catalog:
  '@types/react': ~19.2.14
  '@types/react-dom': ~19.2.3

overrides:
  '@types/react': ~19.2.14
  '@types/react-dom': ~19.2.3
`;

test("catalog/overrides consistent -> no errors", () => {
  assert.deepEqual(checkWorkspacePins(goodYaml), []);
});

test("catalog/overrides divergence fails", () => {
  const bad = goodYaml.replace("overrides:\n  '@types/react': ~19.2.14", "overrides:\n  '@types/react': ~19.1.0");
  const errors = checkWorkspacePins(bad);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /diverge/);
});

test("missing pins fail", () => {
  const errors = checkWorkspacePins("catalog:\n  react: 19.1.0\noverrides:\n  esbuild: 1.0.0\n");
  assert.equal(errors.length, 4);
});

const catalog = yamlSectionPins(goodYaml, "catalog");

test("manifest using catalog: passes", () => {
  const errors = checkManifestPins("a/package.json", { devDependencies: { "@types/react": "catalog:" } }, catalog);
  assert.deepEqual(errors, []);
});

test("manifest matching catalog pin exactly passes", () => {
  const errors = checkManifestPins("a/package.json", { devDependencies: { "@types/react": "~19.2.14", "@types/react-dom": "~19.2.3" } }, catalog);
  assert.deepEqual(errors, []);
});

test("manifest with divergent @types/react pin fails", () => {
  const errors = checkManifestPins("a/package.json", { dependencies: { "@types/react": "^19.1.0" } }, catalog);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /a\/package\.json pins @types\/react@\^19\.1\.0/);
});

test("manifest with divergent @types/react-dom devDependency fails", () => {
  const errors = checkManifestPins("a/package.json", { devDependencies: { "@types/react-dom": "19.0.0" } }, catalog);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /@types\/react-dom@19\.0\.0/);
});

test("manifest without react types passes", () => {
  assert.deepEqual(checkManifestPins("a/package.json", { dependencies: { react: "19.1.0" } }, catalog), []);
});

test("lockfile with single versions passes", () => {
  const lock = `'@types/react@19.2.17':\n  x\n'@types/react-dom@19.2.3(@types/react@19.2.17)':\n`;
  assert.deepEqual(checkLockfile(lock), []);
});

test("lockfile with two @types/react versions fails", () => {
  const lock = `'@types/react@19.2.17':\n'@types/react@19.1.10':\n'@types/react-dom@19.2.3(@types/react@19.2.17)':\n`;
  const errors = checkLockfile(lock);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /multiple versions of @types\/react: 19\.1\.10, 19\.2\.17/);
});

test("installed copies: single version passes, duplicates fail", () => {
  assert.deepEqual(
    checkInstalledCopies(["@types+react@19.2.17", "@types+react-dom@19.2.3_@types+react@19.2.17"]),
    [],
  );
  const errors = checkInstalledCopies([
    "@types+react@19.2.17",
    "@types+react@19.1.10",
    "@types+react-dom@19.2.3_@types+react@19.2.17",
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /multiple copies of @types\/react/);
});

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("workspace manifest discovery covers all artifact and lib packages", () => {
  const workspaceYaml = readFileSync(resolve(ROOT, "pnpm-workspace.yaml"), "utf8");
  const patterns = workspaceYaml.match(/^packages:\n((?:  - .+\n)+)/m)![1]
    .split("\n").filter(Boolean).map((l) => l.replace(/^\s+-\s*/, "").replace(/['"]/g, ""));
  const manifests = findWorkspaceManifests(ROOT, patterns);
  const rel = manifests.map((m) => m.slice(ROOT.length + 1));
  for (const expected of [
    "artifacts/loyalty-app/package.json",
    "artifacts/sparkly-web/package.json",
    "artifacts/mockup-sandbox/package.json",
    "artifacts/api-server/package.json",
    "scripts/package.json",
  ]) {
    assert.ok(rel.includes(expected), `expected discovery of ${expected}, got: ${rel.join(", ")}`);
  }
});

test("full run against the real workspace passes", () => {
  assert.deepEqual(runChecks(ROOT), []);
});

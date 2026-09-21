/**
 * Guard: enforce a single @types/react / @types/react-dom version workspace-wide.
 *
 * Fails loudly if:
 *  1. pnpm-workspace.yaml catalog and overrides entries diverge for either package.
 *  2. Any workspace package.json pins either package to something other than the
 *     catalog reference (`catalog:`) or the exact catalog pin.
 *  3. pnpm-lock.yaml resolves more than one version of either package.
 *  4. node_modules/.pnpm contains more than one installed copy of either package
 *     (orphan dirs from old installs break typechecks with "two unrelated types"
 *     errors — fix by deleting orphan dirs and running `pnpm install --force`).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGES = ["@types/react", "@types/react-dom"] as const;

export function yamlSectionPins(yaml: string, section: string): Map<string, string> {
  const pins = new Map<string, string>();
  const lines = yaml.split("\n");
  const start = lines.findIndex((l) => l.trimEnd() === `${section}:`);
  if (start === -1) return pins;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    if (!/^\s/.test(line)) break; // end of section
    const m = line.match(/^\s+'?([^':]+)'?:\s*(.+)$/);
    if (!m) continue;
    pins.set(m[1], m[2].replace(/^['"]|['"]$/g, "").trim());
  }
  return pins;
}

export function yamlListSection(yaml: string, section: string): string[] {
  const items: string[] = [];
  const lines = yaml.split("\n");
  const start = lines.findIndex((l) => l.trimEnd() === `${section}:`);
  if (start === -1) return items;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    if (!/^\s/.test(line)) break;
    const m = line.match(/^\s+-\s*'?([^']+?)'?\s*$/);
    if (m) items.push(m[1]);
  }
  return items;
}

/** Check catalog vs overrides consistency. */
export function checkWorkspacePins(workspaceYaml: string): string[] {
  const errors: string[] = [];
  const catalog = yamlSectionPins(workspaceYaml, "catalog");
  const overrides = yamlSectionPins(workspaceYaml, "overrides");
  for (const pkg of PACKAGES) {
    const cat = catalog.get(pkg);
    const ovr = overrides.get(pkg);
    if (!cat) errors.push(`pnpm-workspace.yaml catalog is missing a pin for ${pkg}`);
    if (!ovr) errors.push(`pnpm-workspace.yaml overrides is missing a pin for ${pkg}`);
    if (cat && ovr && cat !== ovr) {
      errors.push(
        `pnpm-workspace.yaml pins for ${pkg} diverge: catalog=${cat} overrides=${ovr}`,
      );
    }
  }
  return errors;
}

/**
 * Check one workspace package manifest: any @types/react(-dom) entry must be
 * `catalog:` or exactly the catalog pin.
 */
export function checkManifestPins(
  manifestPath: string,
  manifest: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  },
  catalog: Map<string, string>,
): string[] {
  const errors: string[] = [];
  const deps: Record<string, string> = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
  };
  for (const pkg of PACKAGES) {
    const pin = deps[pkg];
    if (!pin) continue;
    const cat = catalog.get(pkg);
    if (pin !== "catalog:" && pin !== cat) {
      errors.push(
        `${manifestPath} pins ${pkg}@${pin} but workspace catalog pins ${cat ?? "(none)"} — use "catalog:" or the same pin`,
      );
    }
  }
  return errors;
}

/** Check pnpm-lock.yaml resolves exactly one version of each package. */
export function checkLockfile(lockfile: string): string[] {
  const errors: string[] = [];
  for (const pkg of PACKAGES) {
    const re = new RegExp(`${pkg.replace("/", "\\/")}@(\\d[^'")(:,\\s]*)`, "g");
    const versions = new Set<string>();
    for (const m of lockfile.matchAll(re)) versions.add(m[1]);
    if (versions.size > 1) {
      errors.push(
        `pnpm-lock.yaml resolves multiple versions of ${pkg}: ${[...versions].sort().join(", ")}`,
      );
    } else if (versions.size === 0) {
      errors.push(`pnpm-lock.yaml resolves no version of ${pkg} — expected exactly one`);
    }
  }
  return errors;
}

/** Check installed copies in node_modules/.pnpm (catches orphan dirs). */
export function checkInstalledCopies(pnpmDirEntries: string[]): string[] {
  const errors: string[] = [];
  for (const pkg of PACKAGES) {
    const prefix = pkg.replace("/", "+") + "@";
    const installed = pnpmDirEntries
      .filter((e) => e.startsWith(prefix))
      .map((e) => e.slice(prefix.length).split("_")[0]);
    const versions = [...new Set(installed)].sort();
    if (versions.length > 1) {
      errors.push(
        `node_modules/.pnpm contains multiple copies of ${pkg}: ${versions.join(", ")}. ` +
          `Delete the orphan dirs (and stale *.tsbuildinfo files), then run \`pnpm install --force\`.`,
      );
    }
  }
  return errors;
}

/** Expand workspace package globs (e.g. "artifacts/*") into manifest paths. */
export function findWorkspaceManifests(root: string, patterns: string[]): string[] {
  const manifests: string[] = [];
  for (const pattern of patterns) {
    const dirs = pattern.endsWith("/*")
      ? (() => {
          const base = join(root, pattern.slice(0, -2));
          if (!existsSync(base)) return [] as string[];
          return readdirSync(base, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => join(base, d.name));
        })()
      : [join(root, pattern)];
    for (const dir of dirs) {
      const p = join(dir, "package.json");
      if (existsSync(p)) manifests.push(p);
    }
  }
  return manifests;
}

export function runChecks(root: string): string[] {
  const errors: string[] = [];
  const workspaceYaml = readFileSync(resolve(root, "pnpm-workspace.yaml"), "utf8");
  const catalog = yamlSectionPins(workspaceYaml, "catalog");

  errors.push(...checkWorkspacePins(workspaceYaml));

  const patterns = yamlListSection(workspaceYaml, "packages");
  const manifests = findWorkspaceManifests(root, patterns);
  manifests.push(resolve(root, "package.json")); // workspace root manifest too
  for (const manifestPath of manifests) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    errors.push(...checkManifestPins(manifestPath.slice(root.length + 1), manifest, catalog));
  }

  errors.push(...checkLockfile(readFileSync(resolve(root, "pnpm-lock.yaml"), "utf8")));

  const pnpmDir = resolve(root, "node_modules/.pnpm");
  if (existsSync(pnpmDir)) {
    errors.push(...checkInstalledCopies(readdirSync(pnpmDir)));
  }
  return errors;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const errors = runChecks(ROOT);
  if (errors.length > 0) {
    console.error("React type version check FAILED:\n");
    for (const e of errors) console.error(`  ✗ ${e}`);
    console.error(
      "\nAll @types/react and @types/react-dom pins must resolve to a single version workspace-wide.",
    );
    process.exit(1);
  }
  console.log(
    `React type versions OK across ${new Set([...PACKAGES]).size} packages and ${runChecksManifestCount(ROOT)} workspace manifests.`,
  );
}

function runChecksManifestCount(root: string): number {
  const workspaceYaml = readFileSync(resolve(root, "pnpm-workspace.yaml"), "utf8");
  return findWorkspaceManifests(root, yamlListSection(workspaceYaml, "packages")).length + 1;
}

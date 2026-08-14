import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "artifacts");
const pnpmCli = process.env.npm_execpath;
if (!pnpmCli) throw new Error("Run this generator through pnpm.");
const packageJson = JSON.parse(
  await fs.readFile(path.join(root, "package.json"), "utf8"),
);
const licenseGroups = JSON.parse(
  execFileSync(
    process.execPath,
    [pnpmCli, "licenses", "list", "--json", "--prod"],
    {
      cwd: root,
      encoding: "utf8",
    },
  ),
);
const packages = [];
for (const [licenseGroup, entries] of Object.entries(licenseGroups)) {
  for (const entry of entries) {
    for (const version of entry.versions) {
      packages.push({
        SPDXID: `SPDXRef-Package-${safeId(entry.name)}-${safeId(version)}`,
        name: entry.name,
        versionInfo: version,
        downloadLocation: entry.homepage || "NOASSERTION",
        filesAnalyzed: false,
        licenseConcluded:
          licenseGroup === "Unknown"
            ? "NOASSERTION"
            : normalizeLicense(licenseGroup),
        licenseDeclared:
          licenseGroup === "Unknown"
            ? "NOASSERTION"
            : normalizeLicense(licenseGroup),
        copyrightText: "NOASSERTION",
        supplier: entry.author
          ? `Person: ${String(entry.author)}`
          : "NOASSERTION",
      });
    }
  }
}
packages.sort((left, right) =>
  `${left.name}@${left.versionInfo}`.localeCompare(
    `${right.name}@${right.versionInfo}`,
  ),
);
const lockHash = await fileHash("pnpm-lock.yaml");
const created = new Date().toISOString();
const namespace = `https://ukd.local/sbom/${packageJson.version}/${lockHash.slice(0, 16)}`;
const sbom = {
  spdxVersion: "SPDX-2.3",
  dataLicense: "CC0-1.0",
  SPDXID: "SPDXRef-DOCUMENT",
  name: `${packageJson.name}-${packageJson.version}`,
  documentNamespace: namespace,
  creationInfo: {
    created,
    creators: ["Tool: UKD release-metadata/1.0.0"],
    licenseListVersion: "3.27",
  },
  documentDescribes: packages.map((entry) => entry.SPDXID),
  packages,
};
const distFiles = await listFiles(path.join(root, "dist"));
const provenance = {
  predicateType: "https://slsa.dev/provenance/v1",
  subject: await Promise.all(
    distFiles.map(async (file) => ({
      name: path.relative(root, file).replaceAll("\\", "/"),
      digest: { sha256: await absoluteFileHash(file) },
    })),
  ),
  predicate: {
    buildDefinition: {
      buildType: "https://ukd.local/build/vite-static/v1",
      externalParameters: {
        sourceCommit: process.env.GITHUB_SHA || gitCommit(),
        node: process.version,
        packageManager: packageJson.packageManager,
      },
      resolvedDependencies: [
        {
          uri: "git+https://github.com/badbugsarts-hue/ukd-grow-masterplan-2026",
        },
        { uri: "file:pnpm-lock.yaml", digest: { sha256: lockHash } },
        {
          uri: "file:public/data/data-manifest.json",
          digest: { sha256: await fileHash("public/data/data-manifest.json") },
        },
      ],
    },
    runDetails: {
      builder: { id: process.env.GITHUB_WORKFLOW_REF || "local-build" },
      metadata: { invocationId: process.env.GITHUB_RUN_ID || "local" },
    },
  },
};
const unresolved = packages.filter(
  (entry) => entry.licenseDeclared === "NOASSERTION",
);
await fs.mkdir(output, { recursive: true });
await Promise.all([
  fs.writeFile(
    path.join(output, "ukd-sbom.spdx.json"),
    `${JSON.stringify(sbom, null, 2)}\n`,
  ),
  fs.writeFile(
    path.join(output, "ukd-provenance.json"),
    `${JSON.stringify(provenance, null, 2)}\n`,
  ),
  fs.writeFile(
    path.join(output, "license-audit.json"),
    `${JSON.stringify(
      {
        generatedAt: created,
        packageCount: packages.length,
        unresolved: unresolved.map(({ name, versionInfo }) => ({
          name,
          version: versionInfo,
        })),
        releaseReady: unresolved.length === 0,
      },
      null,
      2,
    )}\n`,
  ),
]);
if (process.env.UKD_STRICT_LICENSES === "1" && unresolved.length > 0) {
  throw new Error(
    `${unresolved.length} dependency licenses remain unresolved.`,
  );
}
process.stdout.write(
  `Release metadata generated: ${packages.length} packages, ${distFiles.length} artifacts, ${unresolved.length} unresolved licenses.\n`,
);

function normalizeLicense(value) {
  return value === "MIT/X11" ? "MIT" : value;
}

function safeId(value) {
  return String(value).replace(/[^A-Za-z0-9.-]+/g, "-");
}

async function listFiles(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return (
      await Promise.all(
        entries.map((entry) => {
          const absolute = path.join(directory, entry.name);
          return entry.isDirectory() ? listFiles(absolute) : [absolute];
        }),
      )
    ).flat();
  } catch {
    return [];
  }
}

async function fileHash(relativePath) {
  return absoluteFileHash(path.join(root, relativePath));
}

async function absoluteFileHash(absolutePath) {
  return createHash("sha256")
    .update(await fs.readFile(absolutePath))
    .digest("hex");
}

function gitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

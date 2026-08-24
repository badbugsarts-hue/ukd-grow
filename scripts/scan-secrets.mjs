import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[opusr]_[A-Za-z0-9_]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
];
const files = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  {
    cwd: root,
    encoding: "utf8",
  },
)
  .split("\0")
  .filter(Boolean);
const findings = [];
for (const relativePath of files) {
  const absolutePath = path.join(root, relativePath);
  const stat = await fs.stat(absolutePath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (!stat) continue;
  if (stat.size > 2_000_000) continue;
  const content = await fs.readFile(absolutePath, "utf8").catch(() => "");
  content.split(/\r?\n/).forEach((line, index) => {
    if (patterns.some((pattern) => pattern.test(line)))
      findings.push(`${relativePath}:${index + 1}`);
  });
}
if (findings.length > 0) {
  process.stderr.write(`Potential secrets found:\n${findings.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Secret pattern scan passed across ${files.length} tracked files.\n`,
  );
}

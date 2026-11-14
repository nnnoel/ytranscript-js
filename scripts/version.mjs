// Stops a release whose version, changelog and tag don't agree.
//
//   node scripts/version.mjs changelog     run by `npm version` before it bumps anything
//   node scripts/version.mjs check <tag>   run by the release workflow
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const pkg = JSON.parse(read("package.json"));
const [mode, tag] = process.argv.slice(2);

// During `npm version`, package.json still holds the old number at this point.
const version = mode === "changelog" ? (process.env.npm_new_version ?? pkg.version) : pkg.version;
const problems = [];

if (!read("CHANGELOG.md").split("\n").some((line) => line.trim() === `## ${version}`)) {
  problems.push(`CHANGELOG.md has no "## ${version}" entry. Add one and commit it first.`);
}

if (mode === "check") {
  if (!tag) problems.push("Usage: node scripts/version.mjs check <tag>");
  else if (tag !== `v${version}`) problems.push(`Tag ${tag} doesn't match package.json version ${version}.`);
} else if (mode !== "changelog") {
  problems.push("Usage: node scripts/version.mjs changelog | check <tag>");
}

if (problems.length) {
  for (const problem of problems) console.error(`Release check failed: ${problem}`);
  process.exit(1);
}
console.log(`Release check passed for ${pkg.name} ${version}.`);

# Releasing

A release is published by GitHub Actions when a version tag is pushed. No npm
login or one-time code is needed on any machine.

## Steps

1. Add a `## x.y.z` entry to `CHANGELOG.md` and commit it with the change.
2. Bump the version, which also creates the `Release x.y.z` commit and the `vx.y.z` tag:

   ```sh
   npm version patch   # or minor, or major
   ```

3. Push the commit and the tag:

   ```sh
   git push --follow-tags
   ```

4. Watch the run: `gh run watch` or the repository's **Actions** tab. The package
   appears on npm about a minute after the run finishes.

`npm version` stops before changing anything if the changelog has no entry for
the new version.

## What the workflow does

`.github/workflows/release.yml` checks that the tag, `package.json` and the
changelog agree, then runs `npm publish`, which type-checks and builds first
(`prepublishOnly`). It signs in to npm through
[trusted publishing](https://docs.npmjs.com/trusted-publishers), so no token is
stored, and npm attaches a provenance statement that links the package to the
commit it was built from.

## If a run fails

Fix the cause and re-run the job from the **Actions** tab. Re-running is safe:
a version that is already on npm is skipped. A version number can't be reused
once it is on npm, so a bad release is fixed by publishing the next patch.

## One-time setup

On npmjs.com, under the package's **Settings**, **Trusted Publisher**: GitHub
Actions, user `nnnoel`, repository `ytranscript-js`, workflow `release.yml`,
with `npm publish` allowed. If the workflow file is ever renamed, delete that
entry and add a new one, because entries can't be edited.

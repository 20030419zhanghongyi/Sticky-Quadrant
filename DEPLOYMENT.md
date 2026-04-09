# Deployment

## Real deployment shape

Sticky Quadrant is a Windows-first Electron desktop application.

- Desktop distribution: GitHub Releases
- Automated packaging: GitHub Actions on pushed version tags
- Online showcase page: GitHub Pages served from `docs/`

This strategy was chosen because the repository's product is fundamentally a desktop app, not a normal web-only site. The renderer is built for Electron and should not be treated as the primary deploy target.

## Project classification

This repository fits **A. Pure Electron desktop app**.

- Electron main process entry: `electron/main.cjs`
- Renderer entry: `src/main.tsx`
- Renderer build tool: Vite
- Packaging tool: `electron-builder`

## Local development

Install dependencies:

```powershell
npm ci
```

Run the Electron app in development:

```powershell
npm run dev
```

Useful related commands:

```powershell
npm run dev:renderer
npm run start
```

## Local Windows packaging

Build the renderer only:

```powershell
npm run build:renderer
```

Create both Windows release artifacts:

```powershell
npm run pack:win
```

Create only the portable executable:

```powershell
npm run pack:win:portable
```

Create only the NSIS installer:

```powershell
npm run pack:win:nsis
```

Expected output directory:

```text
release/
```

Expected artifact names:

- `Sticky-Quadrant-Setup-<version>-x64.exe`
- `Sticky-Quadrant-Portable-<version>-x64.exe`

## GitHub Pages

The showcase page is a static site in `docs/`.

- Entry file: `docs/index.html`
- Styles: `docs/styles.css`
- Assets: `docs/assets/`
- Fallback redirect: `docs/404.html`

The page uses relative asset paths, so it works correctly under the repository project path:

```text
/Sticky-Quadrant/
```

To enable GitHub Pages:

1. Open the repository on GitHub.
2. Go to `Settings -> Pages`.
3. Under `Build and deployment`, choose `GitHub Actions`.
4. Push to `main` or `master`, or run the `Deploy Showcase Page` workflow manually.

Expected URL:

```text
https://20030419zhanghongyi.github.io/Sticky-Quadrant/
```

## GitHub Actions release flow

Workflow file:

```text
.github/workflows/release.yml
```

Trigger:

- Push a tag matching `v*`
- Example: `v0.1.0`

What the workflow does:

1. Runs on `windows-latest`
2. Installs dependencies with `npm ci`
3. Builds the renderer
4. Packages the Electron app for Windows
5. Creates or updates the GitHub Release for the pushed tag
6. Uploads `release/*.exe` artifacts

Publish a new version:

```powershell
git tag v0.1.0
git push origin v0.1.0
```

If you also update `package.json`, keep the package version aligned with the tag you push.

## Secrets and permissions

No custom repository secrets are required for the current unsigned release flow.

- `release.yml` uses the built-in `GITHUB_TOKEN`
- `pages.yml` uses standard Pages permissions

Repository settings that must allow the workflows:

- Actions must be enabled
- Workflow permissions should allow `Read and write permissions` for releases if your org/repo policy restricts the default token
- Pages must be enabled with source `GitHub Actions`

Optional future secrets not implemented here:

- Code-signing certificate secrets for signed Windows installers

## Common errors

### `npm ci` fails in Actions

- Check that `package-lock.json` is committed and in sync with `package.json`.

### Release workflow runs but cannot publish a Release

- Confirm repository Actions permissions allow writing release contents.
- Confirm the pushed ref is an actual tag like `v0.1.0`.

### Pages workflow succeeds but no site is visible

- Confirm `Settings -> Pages` is set to `GitHub Actions`.
- Confirm you are visiting the project URL with the repository path suffix:
  `https://20030419zhanghongyi.github.io/Sticky-Quadrant/`

### Packaging fails because of missing Windows-specific tooling

- Build Windows artifacts on Windows only.
- The provided release workflow already uses `windows-latest`.

### Installer or portable EXE is unsigned

- This is expected in the current setup.
- Windows SmartScreen warnings may appear until code signing is added.

## Completed vs manual tasks

Completed in the repository:

- Added a static GitHub Pages showcase in `docs/`
- Added a Pages deployment workflow
- Added a tag-driven Windows release workflow
- Updated packaging scripts to produce installer and portable builds
- Updated `README.md`
- Added `DEPLOYMENT.md`
- Added `RELEASE_SUMMARY.md`

Still requires manual work in GitHub settings:

1. Enable GitHub Pages with `GitHub Actions`
2. Ensure Actions are enabled for the repository
3. Ensure workflow token permissions allow creating Releases if your repository policy is restrictive
4. Push a real version tag to trigger the first release
5. Replace placeholder showcase screenshots with real app captures when available
